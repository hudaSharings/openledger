"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { budgetItemSchema } from "@/src/lib/validations";
import { createBudgetItem, updateBudgetItem, deleteBudgetItem, getCategories, getPaymentAccounts, getBudgetItems } from "@/src/lib/actions/financial";
import { getExpenseTemplates, createExpenseTemplate, copyBudgetFromMonth } from "@/src/lib/actions/templates";
import { useSession } from "next-auth/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { format, subMonths, addMonths, parse } from "date-fns";
import { Trash2, Plus, Copy, Search, X, Save, ChevronLeft, ChevronRight, RotateCcw, Pencil, Lock, Filter } from "lucide-react";
import { LoadingSpinner } from "./ui/loading-spinner";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/src/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface BudgetItem {
  id: string;
  description: string;
  amount: string;
  categoryId: string;
  categoryName: string;
  categoryType: string;
  accountId: string;
  accountName: string;
  actualSpent: number;
  color: string | null;
}

interface ExpenseTemplate {
  id: string;
  description: string;
  amount: string;
  categoryId: string;
  categoryName: string;
  categoryType: string;
  accountId: string;
  accountName: string;
}

export function PlanningEntry({ monthYear }: { monthYear: string }) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const router = useRouter();
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTemplates, setFilteredTemplates] = useState<ExpenseTemplate[]>([]);
  const [showTemplateSearch, setShowTemplateSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyFromMonth, setCopyFromMonth] = useState("");
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all"); // "all", "mandatory", "periodic", "ad_hoc"

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(budgetItemSchema),
    defaultValues: {
      monthYear,
      description: "",
      amount: "",
      categoryId: "",
      allocatedToAccountId: "",
      color: "blue",
    },
  });

  const categoryId = watch("categoryId");
  const accountId = watch("allocatedToAccountId");
  const description = watch("description");
  const selectedColor = watch("color");

  // Navigation functions
  const currentDate = parse(monthYear, "yyyy-MM", new Date());
  const previousMonth = format(subMonths(currentDate, 1), "yyyy-MM");
  const nextMonth = format(addMonths(currentDate, 1), "yyyy-MM");
  const currentMonth = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = monthYear === currentMonth;

  const navigateToMonth = (newMonth: string) => {
    router.push(`/budget/${newMonth}`);
  };

  const resetToCurrentMonth = () => {
    router.push(`/budget/${currentMonth}`);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, accs, items, temps] = await Promise.all([
          getCategories(),
          getPaymentAccounts(),
          getBudgetItems(monthYear),
          getExpenseTemplates(),
        ]);
        setCategories(cats);
        setAccounts(accs);
        setBudgetItems(items);
        setTemplates(temps);
        setFilteredTemplates(temps);
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [monthYear]);

  // Load data when dialog opens
  useEffect(() => {
    if (addItemDialogOpen) {
      async function loadData() {
        const [cats, accs, temps] = await Promise.all([
          getCategories(),
          getPaymentAccounts(),
          getExpenseTemplates(),
        ]);
        setCategories(cats);
        setAccounts(accs);
        setTemplates(temps);
        setFilteredTemplates(temps);
      }
      loadData();
    }
  }, [addItemDialogOpen]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = templates.filter((t) =>
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTemplates(filtered);
    } else {
      setFilteredTemplates(templates);
    }
  }, [searchQuery, templates]);

  const onSubmit = async (data: any) => {
    setError(null);
    setSuccess(false);
    try {
      let result;
      if (editingItem) {
        // Update existing item - remove monthYear from data
        const { monthYear: _, ...updateData } = data;
        result = await updateBudgetItem(editingItem!.id, updateData);
      } else {
        // Create new item
        result = await createBudgetItem(data);
      }

      if (result && "error" in result) {
        setError(typeof result.error === "string" ? result.error : "An error occurred");
      } else if (result && result.success) {
        setSuccess(true);
        reset({
          monthYear,
          description: "",
          amount: "",
          categoryId: "",
          allocatedToAccountId: "",
          color: "blue",
        });
        setEditingItem(null);
        // Reload budget items
        const items = await getBudgetItems(monthYear);
        setBudgetItems(items);
        // Close dialog after short delay
        setTimeout(() => {
          setAddItemDialogOpen(false);
          setEditDialogOpen(false);
          setSuccess(false);
        }, 1500);
      }
    } catch (err: any) {
      console.error("Error submitting form:", err);
      setError(editingItem ? `Failed to update budget item: ${err.message || err.toString()}` : `Failed to create budget item: ${err.message || err.toString()}`);
    }
  };

  const handleUseTemplate = (template: ExpenseTemplate) => {
    setValue("description", template.description);
    setValue("amount", template.amount);
    setValue("categoryId", template.categoryId);
    setValue("allocatedToAccountId", template.accountId);
    setShowTemplateSearch(false);
    setSearchQuery("");
  };

  const handleSaveAsTemplate = async () => {
    if (!description || !categoryId || !accountId) {
      setError("Please fill in description, category, and account to save as recurring item");
      return;
    }

    try {
      const amount = watch("amount");
      await createExpenseTemplate({
        description,
        amount: amount || "0",
        categoryId,
        accountId,
      });
      // Reload templates
      const temps = await getExpenseTemplates();
      setTemplates(temps);
      setFilteredTemplates(temps);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Failed to save recurring item");
    }
  };

  const handleCopyFromMonth = async () => {
    if (!copyFromMonth) {
      setError("Please select a month to copy from");
      return;
    }

    try {
      const result = await copyBudgetFromMonth(copyFromMonth, monthYear);
      if (result && "error" in result) {
        setError(typeof result.error === "string" ? result.error : "An error occurred");
      } else if (result && result.success) {
        setSuccess(true);
        setCopyDialogOpen(false);
        setCopyFromMonth("");
        // Reload budget items
        const items = await getBudgetItems(monthYear);
        setBudgetItems(items);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError("Failed to copy budget items");
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setAddItemDialogOpen(open);
    if (!open) {
      // Reset form when dialog closes
      reset({
        monthYear,
        description: "",
        amount: "",
        categoryId: "",
        allocatedToAccountId: "",
        color: "blue",
      });
      setEditingItem(null);
      setError(null);
      setSuccess(false);
      setShowTemplateSearch(false);
      setSearchQuery("");
    }
  };

  const handleEditDialogOpenChange = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setEditingItem(null);
      setError(null);
      setSuccess(false);
      // Reset form when closing
      reset({
        monthYear,
        description: "",
        amount: "",
        categoryId: "",
        allocatedToAccountId: "",
        color: "blue",
      });
    }
  };

  // Load data when edit dialog opens
  useEffect(() => {
    if (editDialogOpen && editingItem) {
      async function loadData() {
        const [cats, accs] = await Promise.all([
          getCategories(),
          getPaymentAccounts(),
        ]);
        setCategories(cats);
        setAccounts(accs);
        // Pre-populate form with editing item data
        if (editingItem) {
          setValue("description", editingItem.description);
          setValue("amount", editingItem.amount);
          setValue("categoryId", editingItem.categoryId);
          setValue("allocatedToAccountId", editingItem.accountId);
          setValue("color", editingItem.color || "blue");
        }
      }
      loadData();
    }
  }, [editDialogOpen, editingItem, setValue]);

  const handleEdit = (item: BudgetItem) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this budget item?")) {
      return;
    }

    try {
      const result = await deleteBudgetItem(itemId);
      if (result && "error" in result) {
        setError(typeof result.error === "string" ? result.error : "An error occurred");
      } else if (result && result.success) {
        // Reload budget items
        const items = await getBudgetItems(monthYear);
        setBudgetItems(items);
      }
    } catch (err) {
      setError("Failed to delete budget item");
    }
  };

  // Calculate totals
  const totalPlanned = budgetItems.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
  const mandatoryTotal = budgetItems
    .filter((item) => {
      const cat = categories.find((c) => c.name === item.categoryName);
      return cat?.type === "mandatory";
    })
    .reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);

  // Get color based on selected color or fallback to category type
  const getRowColor = (color: string | null, categoryType: string) => {
    // Use selected color if available, otherwise fallback to category type
    const colorToUse = color || categoryType;
    
    switch (colorToUse) {
      case "red":
        return "bg-red-50 hover:bg-red-100 border-l-4 border-red-500";
      case "yellow":
        return "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-500";
      case "blue":
        return "bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500";
      case "green":
        return "bg-green-50 hover:bg-green-100 border-l-4 border-green-500";
      case "purple":
        return "bg-purple-50 hover:bg-purple-100 border-l-4 border-purple-500";
      case "orange":
        return "bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-500";
      case "pink":
        return "bg-pink-50 hover:bg-pink-100 border-l-4 border-pink-500";
      case "gray":
        return "bg-gray-50 hover:bg-gray-100 border-l-4 border-gray-500";
      // Fallback to category type if color not recognized
      case "mandatory":
        return "bg-red-50 hover:bg-red-100 border-l-4 border-red-500";
      case "periodic":
        return "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-500";
      case "ad_hoc":
        return "bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500";
      default:
        return "bg-white hover:bg-gray-50";
    }
  };

  // Generate list of previous months for copy
  const getPreviousMonths = () => {
    const months: string[] = [];
    const current = parse(monthYear, "yyyy-MM", new Date());
    for (let i = 1; i <= 12; i++) {
      const prevMonth = subMonths(current, i);
      months.push(format(prevMonth, "yyyy-MM"));
    }
    return months;
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateToMonth(previousMonth)}
            className="h-10 w-10"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Monthly Planning</h1>
            <p className="text-gray-600">{format(currentDate, "MMMM yyyy")}</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateToMonth(nextMonth)}
            className="h-10 w-10"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          {!isCurrentMonth && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetToCurrentMonth}
              className="gap-2"
              aria-label="Reset to current month"
            >
              <RotateCcw className="h-4 w-4" />
              Current Month
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {!isAdmin && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Lock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">View only - Admin access required to edit</span>
            </div>
          )}
          {isAdmin && (
            <Dialog open={addItemDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-md">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Budget Item
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">Add Budget Item</DialogTitle>
                <DialogDescription>
                  Plan your monthly expenses and optionally save as template for future use
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">Description</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTemplateSearch(!showTemplateSearch)}
                        className="h-7 text-xs gap-1"
                      >
                        <Search className="h-3 w-3" />
                        Recurring Items
                      </Button>
                      {description && categoryId && accountId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveAsTemplate}
                          className="h-7 text-xs gap-1"
                        >
                          <Save className="h-3 w-3" />
                          Save as Recurring Item
                        </Button>
                      )}
                    </div>
                  </div>
                  {showTemplateSearch && (
                    <div className="border rounded-md p-2 bg-gray-50 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search recurring items..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-8 text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowTemplateSearch(false)}
                          className="h-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {filteredTemplates.length === 0 ? (
                          <p className="text-xs text-gray-500 p-2">No recurring items found</p>
                        ) : (
                          filteredTemplates.map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => handleUseTemplate(template)}
                              className="w-full text-left p-2 rounded hover:bg-white text-sm border border-transparent hover:border-blue-200"
                            >
                              <div className="font-medium">{template.description}</div>
                              <div className="text-xs text-gray-500">
                                ₹{parseFloat(template.amount).toFixed(2)} • {template.categoryName} • {template.accountName}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  <Input
                    id="description"
                    {...register("description")}
                    placeholder="e.g., Monthly Rent, Groceries"
                    className="h-10"
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500">{errors.description.message as string}</p>
                  )}
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      {...register("amount")}
                      placeholder="0.00"
                      className="h-10"
                    />
                    {errors.amount && (
                      <p className="text-sm text-red-500">{errors.amount.message as string}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoryId">Category</Label>
                    <Select value={categoryId} onValueChange={(value) => setValue("categoryId", value)}>
                      <SelectTrigger id="categoryId" className="h-10">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name} ({cat.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.categoryId && (
                      <p className="text-sm text-red-500">{errors.categoryId.message as string}</p>
                    )}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="allocatedToAccountId">Payment Account</Label>
                    <Select
                      value={accountId}
                      onValueChange={(value) => setValue("allocatedToAccountId", value)}
                    >
                      <SelectTrigger id="allocatedToAccountId" className="h-10">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.allocatedToAccountId && (
                      <p className="text-sm text-red-500">
                        {errors.allocatedToAccountId.message as string}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="color">Row Color</Label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {[
                        { value: "red", label: "Red", bg: "bg-red-500" },
                        { value: "yellow", label: "Yellow", bg: "bg-yellow-500" },
                        { value: "blue", label: "Blue", bg: "bg-blue-500" },
                        { value: "green", label: "Green", bg: "bg-green-500" },
                        { value: "purple", label: "Purple", bg: "bg-purple-500" },
                        { value: "orange", label: "Orange", bg: "bg-orange-500" },
                        { value: "pink", label: "Pink", bg: "bg-pink-500" },
                        { value: "gray", label: "Gray", bg: "bg-gray-500" },
                      ].map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setValue("color", color.value)}
                          className={`h-10 w-full rounded-md border-2 transition-all ${
                            selectedColor === color.value
                              ? "border-gray-900 ring-2 ring-offset-2 ring-gray-900"
                              : "border-gray-300 hover:border-gray-400"
                          } ${color.bg} flex items-center justify-center text-white text-xs font-medium shadow-sm`}
                          title={color.label}
                        >
                          {selectedColor === color.value && "✓"}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">Select a color to highlight this budget item in the table</p>
                    {errors.color && (
                      <p className="text-sm text-red-500">{errors.color.message as string}</p>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">✓ Budget item added successfully!</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setAddItemDialogOpen(false);
                      setEditingItem(null);
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
                        Adding...
                      </span>
                    ) : (
                      "Add Budget Item"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
          {isAdmin && (
            <Dialog open={editDialogOpen} onOpenChange={handleEditDialogOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">Edit Budget Item</DialogTitle>
                <DialogDescription>
                  Update the budget item details
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">Description</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTemplateSearch(!showTemplateSearch)}
                        className="h-7 text-xs gap-1"
                      >
                        <Search className="h-3 w-3" />
                        Recurring Items
                      </Button>
                      {description && categoryId && accountId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveAsTemplate}
                          className="h-7 text-xs gap-1"
                        >
                          <Save className="h-3 w-3" />
                          Save as Recurring Item
                        </Button>
                      )}
                    </div>
                  </div>
                  {showTemplateSearch && (
                    <div className="border rounded-md p-2 bg-gray-50 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search recurring items..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-8 text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowTemplateSearch(false)}
                          className="h-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {filteredTemplates.length === 0 ? (
                          <p className="text-xs text-gray-500 p-2">No recurring items found</p>
                        ) : (
                          filteredTemplates.map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => handleUseTemplate(template)}
                              className="w-full text-left p-2 rounded hover:bg-white text-sm border border-transparent hover:border-blue-200"
                            >
                              <div className="font-medium">{template.description}</div>
                              <div className="text-xs text-gray-500">
                                ₹{parseFloat(template.amount).toFixed(2)} • {template.categoryName} • {template.accountName}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  <Input
                    id="description"
                    {...register("description")}
                    placeholder="e.g., Monthly Rent, Groceries"
                    className="h-10"
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500">{errors.description.message as string}</p>
                  )}
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      {...register("amount")}
                      placeholder="0.00"
                      className="h-10"
                    />
                    {errors.amount && (
                      <p className="text-sm text-red-500">{errors.amount.message as string}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoryId">Category</Label>
                    <Select value={categoryId} onValueChange={(value) => setValue("categoryId", value)}>
                      <SelectTrigger id="categoryId" className="h-10">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name} ({cat.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.categoryId && (
                      <p className="text-sm text-red-500">{errors.categoryId.message as string}</p>
                    )}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="allocatedToAccountId">Payment Account</Label>
                    <Select
                      value={accountId}
                      onValueChange={(value) => setValue("allocatedToAccountId", value)}
                    >
                      <SelectTrigger id="allocatedToAccountId" className="h-10">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.allocatedToAccountId && (
                      <p className="text-sm text-red-500">
                        {errors.allocatedToAccountId.message as string}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="color">Row Color</Label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {[
                        { value: "red", label: "Red", bg: "bg-red-500" },
                        { value: "yellow", label: "Yellow", bg: "bg-yellow-500" },
                        { value: "blue", label: "Blue", bg: "bg-blue-500" },
                        { value: "green", label: "Green", bg: "bg-green-500" },
                        { value: "purple", label: "Purple", bg: "bg-purple-500" },
                        { value: "orange", label: "Orange", bg: "bg-orange-500" },
                        { value: "pink", label: "Pink", bg: "bg-pink-500" },
                        { value: "gray", label: "Gray", bg: "bg-gray-500" },
                      ].map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setValue("color", color.value)}
                          className={`h-10 w-full rounded-md border-2 transition-all ${
                            selectedColor === color.value
                              ? "border-gray-900 ring-2 ring-offset-2 ring-gray-900"
                              : "border-gray-300 hover:border-gray-400"
                          } ${color.bg} flex items-center justify-center text-white text-xs font-medium shadow-sm`}
                          title={color.label}
                        >
                          {selectedColor === color.value && "✓"}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">Select a color to highlight this budget item in the table</p>
                    {errors.color && (
                      <p className="text-sm text-red-500">{errors.color.message as string}</p>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">✓ Budget item updated successfully!</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEditDialogOpen(false);
                      setEditingItem(null);
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
          )}
          {isAdmin && (
            <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Copy className="h-4 w-4" />
                Copy from Month
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Copy Budget from Previous Month</DialogTitle>
                <DialogDescription>
                  Select a month to copy all budget items from. This will only work if the current month has no budget items.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Copy from Month</Label>
                  <Select value={copyFromMonth} onValueChange={setCopyFromMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {getPreviousMonths().map((month) => (
                        <SelectItem key={month} value={month}>
                          {format(new Date(`${month}-01`), "MMMM yyyy")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCopyFromMonth} className="w-full">
                  Copy Budget Items
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Planned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{formatCurrency(totalPlanned)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Mandatory Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{formatCurrency(mandatoryTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Budget Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{budgetItems.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Items Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle>Planned Expenses</CardTitle>
              <CardDescription>All budget items for this month</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <Button
                variant={categoryFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("all")}
                className="text-xs sm:text-sm"
              >
                All
              </Button>
              <Button
                variant={categoryFilter === "mandatory" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("mandatory")}
                className="text-xs sm:text-sm data-[state=active]:bg-red-50 data-[state=active]:text-red-700"
              >
                Mandatory
              </Button>
              <Button
                variant={categoryFilter === "periodic" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("periodic")}
                className="text-xs sm:text-sm data-[state=active]:bg-yellow-50 data-[state=active]:text-yellow-700"
              >
                Periodic
              </Button>
              <Button
                variant={categoryFilter === "ad_hoc" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("ad_hoc")}
                className="text-xs sm:text-sm data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                Ad Hoc
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {budgetItems.length === 0 ? (
            <p className="text-center text-gray-600 py-8">
              No budget items yet. Add your first item above or copy from a previous month.
            </p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Planned Amount</TableHead>
                      <TableHead className="text-right">Actual Spent</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetItems
                      .filter((item) => {
                        if (categoryFilter === "all") return true;
                        const categoryType = item.categoryType || "ad_hoc";
                        return categoryType === categoryFilter;
                      })
                      .map((item) => {
                      const actualSpent = item.actualSpent || 0;
                      const balance = parseFloat(item.amount) - actualSpent;
                      const categoryType = item.categoryType || "ad_hoc";
                      return (
                        <TableRow key={item.id} className={`group ${getRowColor(item.color, categoryType)}`}>
                          <TableCell>
                            <div className="space-y-2">
                              <div className="font-medium text-gray-900">{item.description}</div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    categoryType === "mandatory"
                                      ? "bg-red-100 text-red-800"
                                      : categoryType === "periodic"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {item.categoryName}
                                </span>
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">
                                  {item.accountName}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{formatCurrency(actualSpent)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${
                              balance >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            ₹{formatCurrency(balance)}
                          </TableCell>
                          <TableCell className="text-right">
                            {isAdmin ? (
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(item)}
                                  className="h-8 w-8 p-0 hover:bg-blue-100"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4 text-blue-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(item.id)}
                                  className="h-8 w-8 p-0 hover:bg-red-100"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            ) : (
                              <Lock className="h-4 w-4 text-gray-400 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="font-bold bg-gray-50">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        ₹{formatCurrency(
                          budgetItems
                            .filter((item) => {
                              if (categoryFilter === "all") return true;
                              const categoryType = item.categoryType || "ad_hoc";
                              return categoryType === categoryFilter;
                            })
                            .reduce((sum, item) => sum + parseFloat(item.amount), 0)
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{formatCurrency(
                          budgetItems
                            .filter((item) => {
                              if (categoryFilter === "all") return true;
                              const categoryType = item.categoryType || "ad_hoc";
                              return categoryType === categoryFilter;
                            })
                            .reduce((sum, item) => sum + (item.actualSpent || 0), 0)
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{formatCurrency(
                          budgetItems
                            .filter((item) => {
                              if (categoryFilter === "all") return true;
                              const categoryType = item.categoryType || "ad_hoc";
                              return categoryType === categoryFilter;
                            })
                            .reduce((sum, item) => sum + parseFloat(item.amount), 0) -
                          budgetItems
                            .filter((item) => {
                              if (categoryFilter === "all") return true;
                              const categoryType = item.categoryType || "ad_hoc";
                              return categoryType === categoryFilter;
                            })
                            .reduce((sum, item) => sum + (item.actualSpent || 0), 0)
                        )}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {budgetItems
                  .filter((item) => {
                    if (categoryFilter === "all") return true;
                    const categoryType = item.categoryType || "ad_hoc";
                    return categoryType === categoryFilter;
                  })
                  .map((item) => {
                    const actualSpent = item.actualSpent || 0;
                    const balance = parseFloat(item.amount) - actualSpent;
                    const categoryType = item.categoryType || "ad_hoc";
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-lg border ${getRowColor(item.color, categoryType)}`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 mb-2 break-words">
                              {item.description}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  categoryType === "mandatory"
                                    ? "bg-red-100 text-red-800"
                                    : categoryType === "periodic"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {item.categoryName}
                              </span>
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">
                                {item.accountName}
                              </span>
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(item)}
                                className="h-8 w-8 p-0 hover:bg-blue-100"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(item.id)}
                                className="h-8 w-8 p-0 hover:bg-red-100"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Planned</div>
                            <div className="font-semibold text-gray-900">
                              ₹{formatCurrency(item.amount)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Spent</div>
                            <div className="font-medium text-gray-700">
                              ₹{formatCurrency(actualSpent)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Balance</div>
                            <div className={`font-semibold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                              ₹{formatCurrency(balance)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {/* Mobile Total */}
                <div className="p-4 rounded-lg bg-gray-50 border-2 border-gray-200 font-bold">
                  <div className="text-sm text-gray-600 mb-2">Total</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Planned</div>
                      <div className="text-gray-900">
                        ₹{formatCurrency(
                          budgetItems
                            .filter((item) => {
                              if (categoryFilter === "all") return true;
                              const categoryType = item.categoryType || "ad_hoc";
                              return categoryType === categoryFilter;
                            })
                            .reduce((sum, item) => sum + parseFloat(item.amount), 0)
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Spent</div>
                      <div className="text-gray-700">
                        ₹{formatCurrency(
                          budgetItems
                            .filter((item) => {
                              if (categoryFilter === "all") return true;
                              const categoryType = item.categoryType || "ad_hoc";
                              return categoryType === categoryFilter;
                            })
                            .reduce((sum, item) => sum + (item.actualSpent || 0), 0)
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Balance</div>
                      <div className="text-gray-900">
                        ₹{formatCurrency(
                          budgetItems
                            .filter((item) => {
                              if (categoryFilter === "all") return true;
                              const categoryType = item.categoryType || "ad_hoc";
                              return categoryType === categoryFilter;
                            })
                            .reduce((sum, item) => sum + parseFloat(item.amount), 0) -
                          budgetItems
                            .filter((item) => {
                              if (categoryFilter === "all") return true;
                              const categoryType = item.categoryType || "ad_hoc";
                              return categoryType === categoryFilter;
                            })
                            .reduce((sum, item) => sum + (item.actualSpent || 0), 0)
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
