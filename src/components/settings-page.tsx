"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { inviteSchema, categorySchema, paymentAccountSchema } from "@/src/lib/validations";
import { createInviteToken } from "@/src/lib/actions/auth";
import { createCategory, getCategories, createPaymentAccount, getPaymentAccountsWithUsage, updatePaymentAccount, deletePaymentAccount } from "@/src/lib/actions/financial";
import { getPushSubscriptions } from "@/src/lib/actions/reminders";
import { useSession } from "next-auth/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Copy, Check, Mail, Tag, Plus, Users, Settings as SettingsIcon, Wallet, Pencil, Trash2, Bell, CheckCircle2 } from "lucide-react";
import { LoadingSpinner } from "./ui/loading-spinner";
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
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; inUse?: boolean }>>([]);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<{ id: string; name: string } | null>(null);
  const [editAccountDialogOpen, setEditAccountDialogOpen] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushSubscribing, setPushSubscribing] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushSuccess, setPushSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
  });

  const {
    register: registerCategory,
    handleSubmit: handleSubmitCategory,
    setValue: setCategoryValue,
    watch: watchCategory,
    formState: { errors: categoryErrors, isSubmitting: isSubmittingCategory },
    reset: resetCategory,
  } = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: "ad_hoc" as const,
    },
  });

  const {
    register: registerAccount,
    handleSubmit: handleSubmitAccount,
    formState: { errors: accountErrors, isSubmitting: isSubmittingAccount },
    reset: resetAccount,
    setValue: setAccountValue,
    watch: watchAccount,
  } = useForm<z.infer<typeof paymentAccountSchema>>({
    resolver: zodResolver(paymentAccountSchema),
    defaultValues: {
      name: "",
    },
  });

  const categoryType = watchCategory("type");
  const accountName = watchAccount("name");

  useEffect(() => {
    async function loadData() {
      const [cats, accs] = await Promise.all([
        getCategories(),
        getPaymentAccountsWithUsage(),
      ]);
      setCategories(cats);
      setAccounts(accs);
    }
    loadData();
    checkPushSubscription();
  }, []);

  async function checkPushSubscription() {
    try {
      const subscriptions = await getPushSubscriptions();
      setPushSubscribed(subscriptions.length > 0);
    } catch (err) {
      console.error("Error checking push subscription:", err);
    }
  }

  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  async function subscribeToPushNotifications() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushError("Push notifications are not supported in this browser");
      return;
    }

    setPushSubscribing(true);
    setPushError(null);
    setPushSuccess(null);

    try {
      console.log("Step 1: Requesting notification permission...");
      // Request browser notification permission
      const permission = await Notification.requestPermission();
      console.log("Permission result:", permission);

      if (permission !== "granted") {
        setPushError("Please allow notifications in your browser to enable push notifications");
        setPushSubscribing(false);
        return;
      }

      console.log("Step 2: Getting service worker registration...");
      // Register service worker
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        console.log("No registration found, registering service worker...");
        registration = await navigator.serviceWorker.register("/sw.js");
      }
      
      console.log("Step 3: Waiting for service worker to be ready...");
      await navigator.serviceWorker.ready;
      console.log("Service worker is ready");

      // Get VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      console.log("VAPID key exists:", !!vapidPublicKey);
      
      if (!vapidPublicKey) {
        setPushError("VAPID public key not configured. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY in your environment variables.");
        setPushSubscribing(false);
        return;
      }

      console.log("Step 4: Subscribing to push notifications...");
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
      console.log("Subscription created:", subscription.endpoint);

      console.log("Step 5: Sending subscription to server...");
      // Send subscription to server via API
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey("p256dh")!),
            auth: arrayBufferToBase64(subscription.getKey("auth")!),
          },
        }),
      });

      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error response:", errorText);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Response result:", result);

      if (result.error) {
        setPushError(result.error);
      } else {
        setPushSubscribed(true);
        setPushSuccess("Push notifications enabled!");
        setTimeout(() => {
          setPushSuccess(null);
          checkPushSubscription();
        }, 3000);
      }
    } catch (err: any) {
      console.error("Error in subscribeToPushNotifications:", err);
      setPushError(err.message || "Failed to enable push notifications. Check browser console for details.");
    } finally {
      setPushSubscribing(false);
    }
  }

  // Populate form when editing account
  useEffect(() => {
    if (editAccountDialogOpen && editingAccount) {
      setAccountValue("name", editingAccount.name);
    }
  }, [editAccountDialogOpen, editingAccount, setAccountValue]);

  const onSubmit = async (data: z.infer<typeof inviteSchema>) => {
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
        setCategoryError(typeof result.error === "string" ? result.error : "An error occurred");
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

  const onSubmitAccount = async (data: z.infer<typeof paymentAccountSchema>) => {
    setAccountError(null);
    setAccountSuccess(false);
    try {
      if (editingAccount) {
        // Update existing account
        const result = await updatePaymentAccount(editingAccount.id, data.name);
        if ("error" in result) {
          setAccountError(typeof result.error === "string" ? result.error : "An error occurred");
        } else {
          setAccountSuccess(true);
          resetAccount();
          setEditingAccount(null);
          // Reload accounts
          const accs = await getPaymentAccountsWithUsage();
          setAccounts(accs);
          setTimeout(() => {
            setEditAccountDialogOpen(false);
            setAccountSuccess(false);
          }, 1500);
        }
      } else {
        // Create new account
        const result = await createPaymentAccount(data.name);
        if ("error" in result) {
          setAccountError(typeof result.error === "string" ? result.error : "An error occurred");
        } else {
          setAccountSuccess(true);
          resetAccount();
          // Reload accounts
          const accs = await getPaymentAccountsWithUsage();
          setAccounts(accs);
          setTimeout(() => {
            setAccountDialogOpen(false);
            setAccountSuccess(false);
          }, 1500);
        }
      }
    } catch (err) {
      setAccountError("An error occurred. Please try again.");
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm("Are you sure you want to delete this payment account?")) {
      return;
    }

    try {
      const result = await deletePaymentAccount(accountId);
      if ("error" in result) {
        setAccountError(typeof result.error === "string" ? result.error : "An error occurred");
      } else {
        // Reload accounts
        const accs = await getPaymentAccountsWithUsage();
        setAccounts(accs);
      }
    } catch (err) {
      setAccountError("Failed to delete payment account");
    }
  };

  const handleEditAccount = (account: { id: string; name: string }) => {
    setEditingAccount(account);
    setEditAccountDialogOpen(true);
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
                      {isSubmittingCategory ? (
                        <span className="flex items-center gap-2">
                          <LoadingSpinner size="sm" className="border-white" />
                          Creating...
                        </span>
                      ) : (
                        "Create Category"
                      )}
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

        {/* Payment Accounts Card */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-100 p-2">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Payment Accounts</CardTitle>
                <CardDescription>
                  Manage payment accounts for income allocations, budget items, and transactions
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 shadow-md">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">Create New Payment Account</DialogTitle>
                  <DialogDescription>
                    Add a new payment account (e.g., Credit Card, Savings Account, Cash)
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitAccount(onSubmitAccount)} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      {...registerAccount("name")}
                      placeholder="e.g., Credit Card, Savings Account, Cash"
                      className="h-10"
                    />
                    {accountErrors.name && (
                      <p className="text-sm text-red-500">{accountErrors.name.message as string}</p>
                    )}
                  </div>

                  {accountError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{accountError}</p>
                    </div>
                  )}
                  {accountSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-600 font-medium">✓ Payment account created successfully!</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setAccountDialogOpen(false);
                        setAccountError(null);
                        setAccountSuccess(false);
                        resetAccount();
                      }}
                      disabled={isSubmittingAccount}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={isSubmittingAccount}
                    >
                      {isSubmittingAccount ? (
                        <span className="flex items-center gap-2">
                          <LoadingSpinner size="sm" className="border-white" />
                          Creating...
                        </span>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Edit Account Dialog */}
            <Dialog open={editAccountDialogOpen} onOpenChange={setEditAccountDialogOpen}>
              <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">Edit Payment Account</DialogTitle>
                  <DialogDescription>
                    Update the payment account name
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitAccount(onSubmitAccount)} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-accountName">Account Name</Label>
                    <Input
                      id="edit-accountName"
                      {...registerAccount("name")}
                      placeholder="e.g., Credit Card, Savings Account, Cash"
                      className="h-10"
                    />
                    {accountErrors.name && (
                      <p className="text-sm text-red-500">{accountErrors.name.message as string}</p>
                    )}
                  </div>

                  {accountError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{accountError}</p>
                    </div>
                  )}
                  {accountSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-600 font-medium">✓ Payment account updated successfully!</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setEditAccountDialogOpen(false);
                        setEditingAccount(null);
                        setAccountError(null);
                        setAccountSuccess(false);
                        resetAccount();
                      }}
                      disabled={isSubmittingAccount}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={isSubmittingAccount}
                    >
                      {isSubmittingAccount ? (
                        <span className="flex items-center gap-2">
                          <LoadingSpinner size="sm" className="border-white" />
                          Saving...
                        </span>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {accounts.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Existing Payment Accounts</h3>
                <div className="space-y-2">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                        account.inUse
                          ? "border-gray-200 bg-gray-50"
                          : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{account.name}</span>
                        {account.inUse && (
                          <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                            In Use
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAccount(account)}
                          className="h-8 w-8 p-0 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={account.inUse ? "Cannot edit: Account is in use" : "Edit"}
                          disabled={account.inUse}
                        >
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAccount(account.id)}
                          className="h-8 w-8 p-0 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={account.inUse ? "Cannot delete: Account is in use" : "Delete"}
                          disabled={account.inUse}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Push Notifications - Compact Section */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Push Notifications</p>
                <p className="text-sm text-gray-500">Get reminders even when the app is closed</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pushSubscribed}
                onChange={(e) => {
                  if (e.target.checked && !pushSubscribed) {
                    subscribeToPushNotifications();
                  }
                }}
                disabled={pushSubscribing}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          {pushError && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600">{pushError}</p>
            </div>
          )}
          {pushSuccess && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-600 font-medium">{pushSuccess}</p>
            </div>
          )}
          {pushSubscribing && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <LoadingSpinner size="sm" />
              <span>Enabling notifications...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Household Members Card - Admin Only */}
      {session?.user?.role === "admin" && (
        <Card className="shadow-md mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-purple-100 p-2">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Household Members</CardTitle>
                <CardDescription>
                  Invite new members and manage existing member roles
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Invite Section */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Invite New Member</h3>
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
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <LoadingSpinner size="sm" className="border-white" />
                            Creating...
                          </span>
                        ) : (
                          "Create Invite"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Member Management Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Manage Members</h3>
              <MemberManagement />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

