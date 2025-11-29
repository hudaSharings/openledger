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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Copy, Check, Mail, Tag, Plus, Users, Settings as SettingsIcon } from "lucide-react";
import { MemberManagement } from "./member-management";

export function SettingsPage() {
  const { data: session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categorySuccess, setCategorySuccess] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

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
        setError(typeof result.error === "string" ? result.error : "An error occurred");
      } else {
        setSuccess("Invite created successfully!");
        const link = `${window.location.origin}/invite/${result.token}`;
        setInviteLink(link);
        reset();
        // Keep dialog open to show the link
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    }
  };

  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        setTimeout(() => {
          setCategoryDialogOpen(false);
          setCategorySuccess(false);
        }, 1500);
      }
    } catch (err) {
      setCategoryError("An error occurred. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-100 p-2">
          <SettingsIcon className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600">Manage your household settings and preferences</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Invite Member Card */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-purple-100 p-2">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Invite Member</CardTitle>
                <CardDescription>
                  Invite a new member to join your household
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-purple-600 hover:bg-purple-700 shadow-md">
                  <Mail className="h-4 w-4 mr-2" />
                  Create Invite
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">Invite New Member</DialogTitle>
                  <DialogDescription>
                    Enter the email address of the person you want to invite to your household
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="member@example.com"
                      className="h-10"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email.message as string}</p>
                    )}
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}
                  {success && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-600 font-medium">✓ {success}</p>
                    </div>
                  )}

                  {inviteLink && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                      <p className="mb-2 text-sm font-medium text-blue-900">Invite Link Created:</p>
                      <div className="flex gap-2">
                        <Input 
                          value={inviteLink} 
                          readOnly 
                          className="flex-1 bg-white text-sm" 
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={copyToClipboard}
                          className="shrink-0"
                        >
                          {copied ? (
                            <>
                              <Check className="h-4 w-4 mr-2 text-green-600" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-blue-700">
                        Share this link with the invited member. It expires in 7 days.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setInviteDialogOpen(false);
                        setError(null);
                        setSuccess(null);
                        setInviteLink(null);
                        reset();
                      }}
                      disabled={isSubmitting}
                    >
                      {inviteLink ? "Close" : "Cancel"}
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Creating..." : "Create Invite"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Categories Card */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-green-100 p-2">
                <Tag className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle>Categories</CardTitle>
                <CardDescription>
                  Manage expense categories for your budget
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-green-600 hover:bg-green-700 shadow-md">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">Create New Category</DialogTitle>
                  <DialogDescription>
                    Add a new expense category to organize your budget and transactions
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitCategory(onSubmitCategory)} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoryName">Category Name</Label>
                    <Input
                      id="categoryName"
                      {...registerCategory("name")}
                      placeholder="e.g., Groceries, Rent, Utilities"
                      className="h-10"
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
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mandatory">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2 w-2 rounded-full bg-red-500"></span>
                            Mandatory
                          </div>
                        </SelectItem>
                        <SelectItem value="periodic">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2 w-2 rounded-full bg-yellow-500"></span>
                            Periodic
                          </div>
                        </SelectItem>
                        <SelectItem value="ad_hoc">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                            Ad Hoc
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {categoryErrors.type && (
                      <p className="text-sm text-red-500">{categoryErrors.type.message as string}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      <strong>Mandatory:</strong> Essential expenses (rent, utilities)
                      <br />
                      <strong>Periodic:</strong> Recurring expenses (subscriptions)
                      <br />
                      <strong>Ad Hoc:</strong> One-time or variable expenses
                    </p>
                  </div>

                  {categoryError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{categoryError}</p>
                    </div>
                  )}
                  {categorySuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-600 font-medium">✓ Category created successfully!</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setCategoryDialogOpen(false);
                        setCategoryError(null);
                        setCategorySuccess(false);
                        resetCategory();
                      }}
                      disabled={isSubmittingCategory}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={isSubmittingCategory}
                    >
                      {isSubmittingCategory ? "Creating..." : "Create Category"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {categories.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Existing Categories</h3>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-medium text-gray-900">{cat.name}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          cat.type === "mandatory"
                            ? "bg-red-100 text-red-800"
                            : cat.type === "periodic"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {cat.type === "mandatory"
                          ? "Mandatory"
                          : cat.type === "periodic"
                          ? "Periodic"
                          : "Ad Hoc"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Member Management - Admin Only */}
      {session?.user?.role === "admin" && (
        <div className="mt-6">
          <MemberManagement />
        </div>
      )}
    </div>
  );
}

