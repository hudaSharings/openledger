"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inviteSchema, categorySchema } from "@/src/lib/validations";
import { createInviteToken } from "@/src/lib/actions/auth";
import { createCategory, getCategories } from "@/src/lib/actions/financial";
import { useSession } from "next-auth/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function SettingsPage() {
  const { data: session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categorySuccess, setCategorySuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(inviteSchema),
  });

  const {
    register: registerCategory,
    handleSubmit: handleSubmitCategory,
    setValue: setCategoryValue,
    watch: watchCategory,
    formState: { errors: categoryErrors, isSubmitting: isSubmittingCategory },
    reset: resetCategory,
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: "ad_hoc" as const,
    },
  });

  const categoryType = watchCategory("type");

  useEffect(() => {
    async function loadCategories() {
      const cats = await getCategories();
      setCategories(cats);
    }
    loadCategories();
  }, []);

  const onSubmit = async (data: { email: string }) => {
    setError(null);
    setSuccess(null);
    setInviteLink(null);

    if (!session?.user?.householdId) {
      setError("Session error. Please sign in again.");
      return;
    }

    try {
      const result = await createInviteToken(session.user.householdId, data.email);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess("Invite created successfully!");
        const link = `${window.location.origin}/invite/${result.token}`;
        setInviteLink(link);
        reset();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    }
  };

  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      alert("Invite link copied to clipboard!");
    }
  };

  const onSubmitCategory = async (data: { name: string; type: "mandatory" | "periodic" | "ad_hoc" }) => {
    setCategoryError(null);
    setCategorySuccess(false);
    try {
      const result = await createCategory(data.name, data.type);
      if ("error" in result) {
        setCategoryError(result.error);
      } else {
        setCategorySuccess(true);
        resetCategory();
        // Reload categories
        const cats = await getCategories();
        setCategories(cats);
      }
    } catch (err) {
      setCategoryError("An error occurred. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">Manage your household settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite Member</CardTitle>
          <CardDescription>
            Invite a new member to join your household. They will receive an email with instructions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="member@example.com"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message as string}</p>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            {inviteLink && (
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="mb-2 text-sm font-medium">Invite Link:</p>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="flex-1" />
                  <Button type="button" variant="outline" onClick={copyToClipboard}>
                    Copy
                  </Button>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Share this link with the invited member. It expires in 7 days.
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating Invite..." : "Create Invite"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Manage expense categories. Categories help organize your budget and transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitCategory(onSubmitCategory)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name</Label>
              <Input
                id="categoryName"
                {...registerCategory("name")}
                placeholder="e.g., Groceries"
              />
              {categoryErrors.name && (
                <p className="text-sm text-red-500">{categoryErrors.name.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryType">Category Type</Label>
              <Select
                value={categoryType}
                onValueChange={(value) => setCategoryValue("type", value as "mandatory" | "periodic" | "ad_hoc")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mandatory">Mandatory</SelectItem>
                  <SelectItem value="periodic">Periodic</SelectItem>
                  <SelectItem value="ad_hoc">Ad Hoc</SelectItem>
                </SelectContent>
              </Select>
              {categoryErrors.type && (
                <p className="text-sm text-red-500">{categoryErrors.type.message as string}</p>
              )}
            </div>

            {categoryError && <p className="text-sm text-red-500">{categoryError}</p>}
            {categorySuccess && (
              <p className="text-sm text-green-600">Category created successfully!</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmittingCategory}>
              {isSubmittingCategory ? "Creating..." : "Create Category"}
            </Button>
          </form>

          {categories.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-medium">Existing Categories</h3>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between rounded-lg border p-2">
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-sm text-gray-600 capitalize">{cat.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

