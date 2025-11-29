"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getExpenseTemplates, createExpenseTemplate, deleteExpenseTemplate, updateExpenseTemplate } from "@/src/lib/actions/templates";
import { getCategories, getPaymentAccounts } from "@/src/lib/actions/financial";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

const templateSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  categoryId: z.string().uuid("Category is required"),
  accountId: z.string().uuid("Account is required"),
});

interface ExpenseTemplate {
  id: string;
  description: string;
  amount: string;
  categoryId: string;
  categoryName: string;
  categoryType: string;
  accountId: string;
  accountName: string;
  inUse?: boolean;
}

export function TemplatesPage() {
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTemplates, setFilteredTemplates] = useState<ExpenseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExpenseTemplate | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      description: "",
      amount: "",
      categoryId: "",
      accountId: "",
    },
  });

  const categoryId = watch("categoryId");
  const accountId = watch("accountId");
  const description = watch("description");
  const amount = watch("amount");

  useEffect(() => {
    async function loadData() {
      try {
        const [temps, cats, accs] = await Promise.all([
          getExpenseTemplates(),
          getCategories(),
          getPaymentAccounts(),
        ]);
        setTemplates(temps);
        setFilteredTemplates(temps);
        setCategories(cats);
        setAccounts(accs);
      } catch (err) {
        setError("Failed to load templates");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Load data when dialogs open
  useEffect(() => {
    if (addDialogOpen || editDialogOpen) {
      async function loadData() {
        const [cats, accs] = await Promise.all([
          getCategories(),
          getPaymentAccounts(),
        ]);
        setCategories(cats);
        setAccounts(accs);
      }
      loadData();
    }
  }, [addDialogOpen, editDialogOpen]);

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

  // Populate form when editing
  useEffect(() => {
    if (editDialogOpen && editingTemplate) {
      setValue("description", editingTemplate.description);
      setValue("amount", editingTemplate.amount);
      setValue("categoryId", editingTemplate.categoryId);
      setValue("accountId", editingTemplate.accountId);
    }
  }, [editDialogOpen, editingTemplate, setValue]);

  const onSubmit = async (data: z.infer<typeof templateSchema>) => {
    setError(null);
    setSuccess(false);
    try {
      if (editingTemplate) {
        // Update existing template
        const result = await updateExpenseTemplate(editingTemplate.id, data);
        if (result.error) {
          setError(typeof result.error === "string" ? result.error : "An error occurred");
        } else {
          setSuccess(true);
          // Reload templates
          const temps = await getExpenseTemplates();
          setTemplates(temps);
          setFilteredTemplates(temps);
          reset();
          setEditingTemplate(null);
          setTimeout(() => {
            setEditDialogOpen(false);
            setSuccess(false);
          }, 1500);
        }
      } else {
        const result = await createExpenseTemplate(data);
        if ("error" in result) {
          setError(typeof result.error === "string" ? result.error : "An error occurred");
        } else {
          setSuccess(true);
          // Reload templates
          const temps = await getExpenseTemplates();
          setTemplates(temps);
          setFilteredTemplates(temps);
          reset();
          setTimeout(() => {
            setAddDialogOpen(false);
            setSuccess(false);
          }, 1500);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to save template");
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) {
      return;
    }

    try {
      await deleteExpenseTemplate(templateId);
      // Reload templates
      const temps = await getExpenseTemplates();
      setTemplates(temps);
      setFilteredTemplates(temps);
    } catch (err) {
      setError("Failed to delete template");
    }
  };

  const handleEdit = (template: ExpenseTemplate) => {
    setEditingTemplate(template);
    setEditDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setAddDialogOpen(open);
    if (!open) {
      reset();
      setError(null);
      setSuccess(false);
    }
  };

  const handleEditDialogOpenChange = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setEditingTemplate(null);
      reset();
      setError(null);
      setSuccess(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expense Templates</h1>
          <p className="text-gray-600">Manage reusable expense templates for quick budget planning</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-md">
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Add Expense Template</DialogTitle>
              <DialogDescription>
                Create a reusable template for common expenses
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
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
                  <Label htmlFor="accountId">Payment Account</Label>
                  <Select
                    value={accountId}
                    onValueChange={(value) => setValue("accountId", value)}
                  >
                    <SelectTrigger id="accountId" className="h-10">
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
                  {errors.accountId && (
                    <p className="text-sm text-red-500">{errors.accountId.message as string}</p>
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
                  <p className="text-sm text-green-600 font-medium">✓ Template {editingTemplate ? "updated" : "created"} successfully!</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setAddDialogOpen(false);
                    setEditingTemplate(null);
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
                  {isSubmitting ? (editingTemplate ? "Saving..." : "Creating...") : (editingTemplate ? "Save Changes" : "Create Template")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Templates ({filteredTemplates.length})</CardTitle>
          <CardDescription>All your expense templates</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No templates found.</p>
              <p className="text-gray-500 text-sm mt-2">
                {searchQuery ? "Try a different search term." : "Create your first template above."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id} className={`group ${template.inUse ? "bg-gray-50" : ""}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{template.description}</span>
                          {template.inUse && (
                            <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                              In Use
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            template.categoryType === "mandatory"
                              ? "bg-red-100 text-red-800"
                              : template.categoryType === "periodic"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {template.categoryName}
                        </span>
                      </TableCell>
                      <TableCell>{template.accountName}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{parseFloat(template.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
                            className="h-8 w-8 p-0 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={template.inUse ? "Cannot edit: Template is in use" : "Edit"}
                            disabled={template.inUse}
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template.id)}
                            className="h-8 w-8 p-0 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={template.inUse ? "Cannot delete: Template is in use" : "Delete"}
                            disabled={template.inUse}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={handleEditDialogOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Expense Template</DialogTitle>
            <DialogDescription>
              Update the template details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
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
                <Label htmlFor="edit-amount">Amount (₹)</Label>
                <Input
                  id="edit-amount"
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
                <Label htmlFor="edit-categoryId">Category</Label>
                <Select value={categoryId} onValueChange={(value) => setValue("categoryId", value)}>
                  <SelectTrigger id="edit-categoryId" className="h-10">
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
                <Label htmlFor="edit-accountId">Payment Account</Label>
                <Select
                  value={accountId}
                  onValueChange={(value) => setValue("accountId", value)}
                >
                  <SelectTrigger id="edit-accountId" className="h-10">
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
                {errors.accountId && (
                  <p className="text-sm text-red-500">{errors.accountId.message as string}</p>
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
                <p className="text-sm text-green-600 font-medium">✓ Template updated successfully!</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditingTemplate(null);
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
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

