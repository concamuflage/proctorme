

"use client";

import React from "react";

type FilterSidebarProps = {
  title?: string;
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
};

function filterTestId(category: string | null) {
  if (category === null) return "products-filter-all";
  return `products-filter-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

export default function FilterSidebar({
  title = "Categories",
  categories,
  selectedCategory,
  onSelectCategory,
}: FilterSidebarProps) {
  return (
    <aside className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          data-testid={filterTestId(null)}
          className={`flex items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition ${
            selectedCategory === null
              ? "bg-zinc-900 text-white"
              : "hover:bg-zinc-50"
          }`}
          onClick={() => onSelectCategory(null)}
        >
          <span>All</span>
        </button>

        {categories.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              data-testid={filterTestId(cat)}
              className={`flex items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition ${
                active ? "bg-zinc-900 text-white" : "hover:bg-zinc-50"
              }`}
              onClick={() => onSelectCategory(cat)}
            >
              <span>{cat}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
