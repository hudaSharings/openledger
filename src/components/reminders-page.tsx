"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reminderSchema } from "@/src/lib/validations";
import {
  createReminder,
  getReminders,
  updateReminder,
  deleteReminder,
} from "@/src/lib/actions/reminders";
import { getBudgetItems } from "@/src/lib/actions/financial";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Bell, Plus, Pencil, Trash2, BellOff, CheckCircle2 } from "lucide-react";
import { LoadingSpinner } from "./ui/loading-spinner";
import { format, formatDistanceToNow } from "date-fns";
import { formatCurrency } from "@/src/lib/utils";
import { z } from "zod";

interface Reminder {
  id: string;
  budgetItemId: string | null;
  description: string;
  amount: string;
  reminderDate: Date;
  daysBeforeDueDate: string | null;
  reminderIntervalDays: string | null;
  isRecurring: boolean;
  recurringPattern: string | null;
  isActive: boolean;
  notified: boolean;
  lastNotifiedDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [budgetItems, setBudgetItems] = useState<Array<{ id: string; description: string; amount: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<z.infer<typeof reminderSchema>>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      description: "",
      amount: "",
      reminderDate: new Date().toISOString(),
      daysBeforeDueDate: 7,
      reminderIntervalDays: 1,
      isRecurring: false,
      recurringPattern: undefined,
      isActive: true,
    },
  });

  const isRecurring = watch("isRecurring");
  const recurringPattern = watch("recurringPattern");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (reminderDialogOpen && editingReminder) {
      setValue("description", editingReminder.description);
      setValue("amount", editingReminder.amount);
      setValue("reminderDate", new Date(editingReminder.reminderDate).toISOString());
      setValue("daysBeforeDueDate", editingReminder.daysBeforeDueDate ? parseInt(editingReminder.daysBeforeDueDate) : 7);
      setValue("reminderIntervalDays", editingReminder.reminderIntervalDays ? parseInt(editingReminder.reminderIntervalDays) : 1);
      setValue("isRecurring", editingReminder.isRecurring);
      setValue("recurringPattern", editingReminder.recurringPattern as any);
      setValue("isActive", editingReminder.isActive);
      setValue("budgetItemId", editingReminder.budgetItemId || undefined);
    }
  }, [reminderDialogOpen, editingReminder, setValue]);

  async function loadData() {
    setLoading(true);
    try {
      const [remindersData, currentMonth] = await Promise.all([
        getReminders(),
        getBudgetItems(format(new Date(), "yyyy-MM")),
      ]);
      setReminders(remindersData.map((r) => ({ ...r, reminderDate: new Date(r.reminderDate) })));
      setBudgetItems(currentMonth.map((item) => ({ id: item.id, description: item.description, amount: item.amount })));
    } catch (err: any) {
      setError(err.message || "Failed to load reminders");
    } finally {
      setLoading(false);
    }
  }
  const onSubmit = async (data: z.infer<typeof reminderSchema>) => {
    setError(null);
    setSuccess(null);

    try {
      if (editingReminder) {
        const result = await updateReminder(editingReminder.id, data);
        if ("error" in result) {
          setError(result.error || "An error occurred");
        } else {
          setSuccess("Reminder updated successfully!");
          setReminderDialogOpen(false);
          setEditingReminder(null);
          reset();
          await loadData();
          setTimeout(() => setSuccess(null), 3000);
        }
      } else {
        const result = await createReminder(data);
        if ("error" in result) {
          setError(result.error || "An error occurred");
        } else {
          setSuccess("Reminder created successfully!");
          setReminderDialogOpen(false);
          reset();
          await loadData();
          setTimeout(() => setSuccess(null), 3000);
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
  };

  const handleDelete = async (reminderId: string) => {
    if (!confirm("Are you sure you want to delete this reminder?")) {
      return;
    }

    try {
      const result = await deleteReminder(reminderId);
      if ("error" in result) {
        setError(result.error || "An error occurred");
      } else {
        setSuccess("Reminder deleted successfully!");
        await loadData();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete reminder");
    }
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setReminderDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-100 p-2">
          <Bell className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Payment Reminders</h1>
          <p className="text-gray-600">Set reminders for upcoming payments and get notified</p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600 font-medium">{success}</p>
        </div>
      )}

      {/* Create Reminder Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogTrigger asChild>
          <Button className="bg-blue-600 hover:bg-blue-700 shadow-md">
            <Plus className="h-4 w-4 mr-2" />
            Add Reminder
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingReminder ? "Edit Reminder" : "Create Payment Reminder"}
            </DialogTitle>
            <DialogDescription>
              Set a reminder for an upcoming payment to help you stay on track
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="budgetItemId">Link to Budget Item (Optional)</Label>
              <Select
                value={watch("budgetItemId") || "none"}
                onValueChange={(value) => setValue("budgetItemId", value === "none" ? undefined : value)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select a budget item (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {budgetItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.description} - {formatCurrency(item.amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                {...register("description")}
                placeholder="e.g., Rent Payment, Credit Card Bill"
                className="h-10"
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                {...register("amount")}
                placeholder="0.00"
                className="h-10"
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminderDate">Due Date & Time *</Label>
              <Input
                id="reminderDate"
                type="datetime-local"
                {...register("reminderDate", {
                  setValueAs: (value) => {
                    if (!value) return new Date().toISOString();
                    return new Date(value).toISOString();
                  },
                })}
                className="h-10"
              />
              {errors.reminderDate && (
                <p className="text-sm text-red-500">{errors.reminderDate.message as string}</p>
              )}
              <p className="text-xs text-gray-500">The date when the payment is due</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="daysBeforeDueDate">Start Reminding (Days Before)</Label>
                <Input
                  id="daysBeforeDueDate"
                  type="number"
                  min="0"
                  max="365"
                  {...register("daysBeforeDueDate", { valueAsNumber: true })}
                  className="h-10"
                />
                {errors.daysBeforeDueDate && (
                  <p className="text-sm text-red-500">{errors.daysBeforeDueDate.message as string}</p>
                )}
                <p className="text-xs text-gray-500">Start sending reminders X days before due date</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminderIntervalDays">Reminder Interval (Days)</Label>
                <Input
                  id="reminderIntervalDays"
                  type="number"
                  min="1"
                  max="30"
                  {...register("reminderIntervalDays", { valueAsNumber: true })}
                  className="h-10"
                />
                {errors.reminderIntervalDays && (
                  <p className="text-sm text-red-500">{errors.reminderIntervalDays.message as string}</p>
                )}
                <p className="text-xs text-gray-500">Send reminder every Y days until due date</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  {...register("isRecurring")}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isRecurring" className="cursor-pointer">
                  Recurring Reminder
                </Label>
              </div>
            </div>

            {isRecurring && (
              <div className="space-y-2">
                <Label htmlFor="recurringPattern">Recurring Pattern</Label>
                <Select
                  value={recurringPattern || ""}
                  onValueChange={(value) => setValue("recurringPattern", value as any)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setReminderDialogOpen(false);
                  setEditingReminder(null);
                  reset();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="sm" className="border-white" />
                    {editingReminder ? "Saving..." : "Creating..."}
                  </span>
                ) : (
                  editingReminder ? "Save Changes" : "Create Reminder"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reminders List */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Your Reminders</CardTitle>
          <CardDescription>
            {reminders.length === 0
              ? "No reminders set yet. Create one to get started."
              : `${reminders.length} reminder${reminders.length !== 1 ? "s" : ""} set`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <p className="text-center text-gray-600 py-8">No reminders yet</p>
          ) : (
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                    reminder.isActive
                      ? reminder.reminderDate <= new Date()
                        ? "border-orange-200 bg-orange-50"
                        : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                      : "border-gray-200 bg-gray-50 opacity-60"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{reminder.description}</h3>
                      {!reminder.isActive && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                          <BellOff className="h-3 w-3 mr-1" />
                          Inactive
                        </span>
                      )}
                      {reminder.notified && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Notified
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Amount: <span className="font-medium">{formatCurrency(reminder.amount)}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {reminder.isRecurring && reminder.recurringPattern && (
                        <span className="capitalize">{reminder.recurringPattern} • </span>
                      )}
                      {format(reminder.reminderDate, "MMM d, yyyy 'at' h:mm a")} •{" "}
                      {reminder.reminderDate > new Date()
                        ? `in ${formatDistanceToNow(reminder.reminderDate)}`
                        : "overdue"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(reminder)}
                      className="h-8 w-8 p-0 hover:bg-blue-100"
                    >
                      <Pencil className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(reminder.id)}
                      className="h-8 w-8 p-0 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

