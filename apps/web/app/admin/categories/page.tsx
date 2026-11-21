"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FolderPlus, Trash2, ExternalLink, Eye, EyeOff } from "lucide-react";

interface ManagedCategory {
  name: string;
  label: string;
  slug: string;
  description: string;
  isCore?: boolean;
  active?: boolean;
  sortOrder?: number;
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const { data, isLoading } = useQuery<{ success: boolean; categories: ManagedCategory[] }>({
    queryKey: ["admin-categories"],
    queryFn: () => api.get("/categories/admin/all"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post("/categories", {
        label: label.trim(),
        slug: slug.trim() || undefined,
        description: description.trim(),
      }),
    onSuccess: () => {
      setLabel("");
      setSlug("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Collection created");
    },
    onError: (err: Error) => toast.error(err.message || "Could not create collection"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ targetSlug, active }: { targetSlug: string; active: boolean }) =>
      api.patch(`/categories/${encodeURIComponent(targetSlug)}`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Collection visibility updated");
    },
    onError: (err: Error) => toast.error(err.message || "Could not update collection"),
  });

  const deleteMutation = useMutation({
    mutationFn: (targetSlug: string) =>
      api.delete(`/categories/${encodeURIComponent(targetSlug)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Custom collection deleted");
    },
    onError: (err: Error) => toast.error(err.message || "Could not delete collection"),
  });

  const categories = data?.categories || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    createMutation.mutate();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Categories &amp; Collections</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your 5 core store departments and launch custom seasonal collections (for example, Bridal Silk or Festive Edit).
        </p>
      </div>

      {/* Create Collection Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderPlus className="h-5 w-5 text-primary" />
            Create Custom Collection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="cat-label" className="block text-xs font-medium text-muted-foreground mb-1">
                Display Name *
              </label>
              <input
                id="cat-label"
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Bridal Silk Edit"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="cat-slug" className="block text-xs font-medium text-muted-foreground mb-1">
                URL Slug (optional)
              </label>
              <input
                id="cat-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="bridal-silk-edit"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="cat-desc" className="block text-xs font-medium text-muted-foreground mb-1">
                Description
              </label>
              <input
                id="cat-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Handpicked wedding & festive silk drapes"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button
                type="submit"
                disabled={createMutation.isPending || !label.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {createMutation.isPending ? "Creating..." : "Create Collection"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading categories...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Collection</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Slug</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categories.map((cat) => {
                    const href = cat.isCore ? `/${cat.slug}` : `/collections/${cat.slug}`;
                    return (
                      <tr key={cat.slug} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{cat.label}</p>
                          {cat.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs">
                              {cat.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {cat.slug}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={cat.isCore ? "secondary" : "default"}>
                            {cat.isCore ? "Core" : "Custom"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={cat.active !== false ? "success" : "warning"}>
                            {cat.active !== false ? "Active" : "Hidden"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={href}
                              className="inline-flex items-center gap-1 rounded-md border border-input px-2.5 py-1 text-xs font-medium hover:bg-muted"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              View
                            </Link>
                            {!cat.isCore && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={toggleMutation.isPending}
                                  onClick={() =>
                                    toggleMutation.mutate({
                                      targetSlug: cat.slug,
                                      active: cat.active === false,
                                    })
                                  }
                                  className="h-7 px-2 text-xs"
                                  title={cat.active !== false ? "Hide collection" : "Show collection"}
                                >
                                  {cat.active !== false ? (
                                    <EyeOff className="h-3.5 w-3.5" />
                                  ) : (
                                    <Eye className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={deleteMutation.isPending}
                                  onClick={() => deleteMutation.mutate(cat.slug)}
                                  className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                  title="Delete custom collection"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
