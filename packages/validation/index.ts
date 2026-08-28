import { z } from "zod";

export const emailSchema = z.string().email("Invalid email address");

export const otpSchema = z
  .string()
  .length(6, "OTP must be 6 digits")
  .regex(/^\d+$/, "OTP must contain only numbers");

export const sendOtpSchema = z.object({
  email: emailSchema,
});

export const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
});

export const loginSchema = z.object({
  mobile: z.string().min(10, "Mobile must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z
  .object({
    sellername: z.string().min(2, "Name must be at least 2 characters"),
    mobile: z.string().min(10, "Mobile must be at least 10 digits"),
    email: emailSchema,
    password: z.string().min(6, "Password must be at least 6 characters"),
    repassword: z.string(),
  })
  .refine((data) => data.password === data.repassword, {
    message: "Passwords do not match",
    path: ["repassword"],
  });

export const checkoutSchema = z.object({
  username: z.string().min(2, "Name is required"),
  email: emailSchema,
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  address: z.string().min(5, "Address is required"),
  pincode: z.string().min(6, "Pincode must be 6 digits"),
  district: z.string().min(2, "District is required"),
  landmark: z.string().optional(),
  payment: z.enum(["COD", "UPI"]),
  upiId: z.string().optional(),
});

export const addToCartSchema = z.object({
  productId: z.number().int().positive(),
  size: z.enum(["Small", "Medium", "Large", "XL", "XXL"]),
  quantity: z.number().int().min(1).max(10),
});

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.number().int().positive(),
  mrp: z.number().int().positive(),
  description: z.string().optional(),
  ptype: z.string().optional(),
  quantity: z.number().int().min(0).optional(),
  size_s: z.number().int().min(0).optional(),
  size_m: z.number().int().min(0).optional(),
  size_l: z.number().int().min(0).optional(),
  size_xl: z.number().int().min(0).optional(),
  size_xxl: z.number().int().min(0).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "Pending",
    "Confirmed",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
    "Refunded",
  ]),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export const couponSchema = z.object({
  code: z.string().min(1),
  discount: z.number().int().min(1).max(100),
  minPurchase: z.number().int().min(0).optional(),
  maxDiscount: z.number().int().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  expiresAt: z.string().datetime(),
});
