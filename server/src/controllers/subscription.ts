import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import { getDb } from "../db.js";
import { ApiError } from "../middleware/error.js";
import type { UserDoc } from "../lib/types.js";
import crypto from "crypto";

export async function getSubscription(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    res.status(200).json({
      plan: user.plan || "free",
      subscriptionStatus: user.subscriptionStatus || "free",
      monthlyGenerationsUsed: user.monthlyGenerationsUsed || 0,
      usageMonth: user.usageMonth,
      currentPeriodEnd: user.currentPeriodEnd,
    });
  } catch (error) {
    next(error);
  }
}

export async function createSubscription(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const planId = process.env.RAZORPAY_PLAN_ID;

    if (!keyId || !keySecret || !planId) {
      throw new ApiError(500, "Razorpay credentials are not configured on the server.");
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify({
        plan_id: planId,
        total_count: 120, // 10 years of monthly billing
        quantity: 1,
        customer_notify: 1,
        notes: {
          userId: req.userId,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Razorpay API Error]:", errText);
      throw new ApiError(502, `Failed to create Razorpay subscription: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    
    const db = await getDb();
    await db.collection<any>("users").updateOne(
      { _id: req.userId },
      {
        $set: {
          razorpaySubscriptionId: data.id,
          updatedAt: Date.now(),
        }
      }
    );

    res.status(200).json({
      subscriptionId: data.id,
      keyId,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleWebhook(req: any, res: Response, next: NextFunction) {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !secret) {
      return res.status(400).json({ error: "Missing signature or webhook secret." });
    }

    // Verify raw request body with Razorpay signature key
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(req.rawBody || "")
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("[Razorpay Webhook Error] Signature verification failed.");
      return res.status(400).json({ error: "Invalid signature verification failed." });
    }

    const event = req.body;
    const subscription = event.payload?.subscription?.entity;
    if (!subscription) {
      return res.status(200).json({ ok: true });
    }

    const subId = subscription.id;
    const userId = subscription.notes?.userId;
    const status = subscription.status;
    
    const db = await getDb();
    const query = userId ? { _id: userId } : { razorpaySubscriptionId: subId };
    const user = await db.collection<any>("users").findOne(query as any);

    if (!user) {
      console.warn(`[Razorpay Webhook] User not found for subscription ${subId}`);
      return res.status(200).json({ ok: true });
    }

    let plan: "free" | "plus" = user.plan ?? "free";
    let subStatus: "free" | "active" | "past_due" | "cancelled" | "expired" = "free";
    const currentPeriodStart = subscription.current_start ?? user.currentPeriodStart;
    const currentPeriodEnd = subscription.current_end ?? user.currentPeriodEnd;

    if (status === "active" || status === "authenticated") {
      plan = "plus";
      subStatus = "active";
    } else if (status === "cancelled") {
      plan = "plus"; // remains plus until current period end
      subStatus = "cancelled";
    } else if (status === "halted") {
      plan = "plus";
      subStatus = "past_due";
    } else if (status === "completed" || status === "expired") {
      plan = "free";
      subStatus = "expired";
    }

    await db.collection<any>("users").updateOne(
      { _id: user._id },
      {
        $set: {
          plan,
          subscriptionStatus: subStatus,
          razorpaySubscriptionId: subId,
          currentPeriodStart,
          currentPeriodEnd,
          updatedAt: Date.now(),
        }
      }
    );

    console.log(`[Razorpay Webhook] Updated user ${user.email} plan to ${plan} (status: ${subStatus})`);
    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
}
