"use client";

import { useState, useEffect } from "react";
import { getHouseholdMembers, updateUserRole } from "@/src/lib/actions/auth";
import { useSession } from "next-auth/react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Users, Shield, User } from "lucide-react";
import { format } from "date-fns";
import { LoadingSpinner } from "./ui/loading-spinner";

interface Member {
  id: string;
  email: string;
  role: "admin" | "member";
  createdAt: Date;
}

export function MemberManagement() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHouseholdMembers();
      setMembers(data.map((m) => ({ ...m, createdAt: new Date(m.createdAt) })));
    } catch (err: any) {
      setError(err.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: "admin" | "member") => {
    setUpdating(userId);
    setError(null);
    try {
      const result = await updateUserRole(userId, newRole);
      if (result.error) {
        setError(result.error);
      } else {
        await loadMembers();
      }
    } catch (err: any) {
      setError(err.message || "Failed to update role");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-8">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-600">Loading members...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-100 p-2">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Household Members</CardTitle>
            <CardDescription>Manage member roles and permissions</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {members.length === 0 ? (
          <p className="text-center text-gray-600 py-8">No members found</p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`rounded-full p-2 ${
                      member.role === "admin" ? "bg-purple-100" : "bg-gray-100"
                    }`}
                  >
                    {member.role === "admin" ? (
                      <Shield className="h-4 w-4 text-purple-600" />
                    ) : (
                      <User className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{member.email}</p>
                      {member.id === session?.user?.id && (
                        <span className="text-xs text-gray-500">(You)</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Joined {format(member.createdAt, "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={member.role}
                    onValueChange={(value) =>
                      handleRoleChange(member.id, value as "admin" | "member")
                    }
                    disabled={
                      updating === member.id ||
                      member.id === session?.user?.id ||
                      session?.user?.role !== "admin"
                    }
                  >
                    <SelectTrigger className="w-32 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-3 w-3" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="member">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          Member
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {updating === member.id && (
                    <LoadingSpinner size="sm" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-xs text-blue-800">
            <strong>Admin:</strong> Can manage budget, invite members, and update roles
            <br />
            <strong>Member:</strong> Can view dashboard and add transaction logs
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

