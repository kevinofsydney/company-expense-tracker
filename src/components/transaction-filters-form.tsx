"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CLASSIFICATION_LABELS,
  REVIEW_STATUS_LABELS,
} from "@/lib/constants";
import type { TransactionFiltersInput } from "@/lib/contracts";

const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

type TransactionFiltersFormProps = {
  mode: "review" | "archive";
  filters: TransactionFiltersInput;
  preservedParams?: Record<string, string | undefined>;
  years?: string[];
};

type TransactionFilterFormState = {
  search: string;
  accountType: string;
  sign: string;
  classification: string;
  reviewStatus: string;
  year: string;
  month: string;
  startDate: string;
  endDate: string;
  suggestedOnly: boolean;
};

function buildFormState(filters: TransactionFiltersInput): TransactionFilterFormState {
  return {
    search: filters.search ?? "",
    accountType: filters.accountType ?? "",
    sign: filters.sign ?? "",
    classification: filters.classification ?? "",
    reviewStatus: filters.reviewStatus ?? "",
    year: filters.year ?? "",
    month: filters.month ?? "",
    startDate: filters.startDate ?? "",
    endDate: filters.endDate ?? "",
    suggestedOnly: filters.suggestedOnly ?? false,
  };
}

function applyFilters(args: {
  mode: "review" | "archive";
  preservedParams: Record<string, string | undefined>;
  state: TransactionFilterFormState;
  pathname: string;
  currentSearch: string;
  router: AppRouterInstance;
  startTransition: React.TransitionStartFunction;
}) {
  const {
    mode,
    preservedParams,
    state,
    pathname,
    currentSearch,
    router,
    startTransition,
  } = args;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(preservedParams)) {
    if (value) {
      params.set(key, value);
    }
  }

  const searchValue = state.search.trim();
  if (searchValue) {
    params.set("search", searchValue);
  }

  const accountType = state.accountType.trim();
  if (accountType) {
    params.set("accountType", accountType);
  }

  const sign = state.sign.trim();
  if (sign) {
    params.set("sign", sign);
  }

  const startDate = state.startDate.trim();
  if (startDate) {
    params.set("startDate", startDate);
  }

  const endDate = state.endDate.trim();
  if (endDate) {
    params.set("endDate", endDate);
  }

  if (state.suggestedOnly) {
    params.set("suggestedOnly", "true");
  }

  if (mode === "archive") {
    const classification = state.classification.trim();
    if (classification) {
      params.set("classification", classification);
    }

    const reviewStatus = state.reviewStatus.trim();
    if (reviewStatus) {
      params.set("reviewStatus", reviewStatus);
    }

    const year = state.year.trim();
    if (year) {
      params.set("year", year);
    }

    const month = state.month.trim();
    if (month) {
      params.set("month", month);
    }
  }

  const query = params.toString();
  const normalizedCurrentSearch = currentSearch.startsWith("?")
    ? currentSearch.slice(1)
    : currentSearch;

  if (query === normalizedCurrentSearch) {
    return;
  }

  startTransition(() => {
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  });
}

export function TransactionFiltersForm({
  mode,
  filters,
  preservedParams = {},
  years = [],
}: TransactionFiltersFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const shouldSkipNextSearchEffect = useRef(true);
  const [formState, setFormState] = useState<TransactionFilterFormState>(() =>
    buildFormState(filters),
  );

  function clearFilters() {
    const next = buildFormState({});
    shouldSkipNextSearchEffect.current = true;
    setFormState(next);
    applyFilters({
      mode,
      preservedParams,
      state: next,
      pathname,
      currentSearch: searchParams.toString(),
      router,
      startTransition,
    });
  }

  useEffect(() => {
    if (shouldSkipNextSearchEffect.current) {
      shouldSkipNextSearchEffect.current = false;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      applyFilters({
        mode,
        preservedParams,
        state: formState,
        pathname,
        currentSearch: searchParams.toString(),
        router,
        startTransition,
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [formState, mode, pathname, preservedParams, router, searchParams, startTransition]);

  return (
    <form
      className={`mt-4 grid gap-4 ${
        mode === "archive" ? "transaction-filters-grid transaction-filters-grid-archive" : "transaction-filters-grid transaction-filters-grid-review"
      }`}
      onSubmit={(event) => {
        event.preventDefault();
        applyFilters({
          mode,
          preservedParams,
          state: formState,
          pathname,
          currentSearch: searchParams.toString(),
          router,
          startTransition,
        });
      }}
    >
      <input
        className="input transaction-filter-search"
        name="search"
        onChange={(event) =>
          setFormState((current) => ({ ...current, search: event.target.value }))
        }
        placeholder="Search details or merchant"
        value={formState.search}
      />
      <select
        className="select"
        name="accountType"
        onChange={(event) =>
          setFormState((current) => {
            const next = { ...current, accountType: event.target.value };
        applyFilters({
          mode,
          preservedParams,
          state: next,
          pathname,
          currentSearch: searchParams.toString(),
              router,
              startTransition,
            });
            return next;
          })
        }
        value={formState.accountType}
      >
        <option value="">All accounts</option>
        <option value="debit">Debit</option>
        <option value="credit">Credit</option>
      </select>
      <select
        className="select"
        name="sign"
        onChange={(event) =>
          setFormState((current) => {
            const next = { ...current, sign: event.target.value };
        applyFilters({
          mode,
          preservedParams,
          state: next,
          pathname,
          currentSearch: searchParams.toString(),
              router,
              startTransition,
            });
            return next;
          })
        }
        value={formState.sign}
      >
        <option value="">Any sign</option>
        <option value="positive">Positive</option>
        <option value="negative">Negative</option>
      </select>

      {mode === "archive" ? (
        <>
          <select
            className="select"
            name="classification"
            onChange={(event) =>
              setFormState((current) => {
                const next = { ...current, classification: event.target.value };
                applyFilters({
                  mode,
                  preservedParams,
                  state: next,
                  pathname,
                  currentSearch: searchParams.toString(),
                  router,
                  startTransition,
                });
                return next;
              })
            }
            value={formState.classification}
          >
            <option value="">Any classification</option>
            <option value="UNCLASSIFIED">Unclassified</option>
            <option value="INCOME">{CLASSIFICATION_LABELS.INCOME}</option>
            <option value="BUSINESS">{CLASSIFICATION_LABELS.BUSINESS}</option>
            <option value="KEVIN">{CLASSIFICATION_LABELS.KEVIN}</option>
            <option value="DAVID">{CLASSIFICATION_LABELS.DAVID}</option>
            <option value="WENONA">{CLASSIFICATION_LABELS.WENONA}</option>
            <option value="KEVIN_WENONA">{CLASSIFICATION_LABELS.KEVIN_WENONA}</option>
            <option value="EXCLUDED">{CLASSIFICATION_LABELS.EXCLUDED}</option>
          </select>
          <select
            className="select"
            name="reviewStatus"
            onChange={(event) =>
              setFormState((current) => {
                const next = { ...current, reviewStatus: event.target.value };
                applyFilters({
                  mode,
                  preservedParams,
                  state: next,
                  pathname,
                  currentSearch: searchParams.toString(),
                  router,
                  startTransition,
                });
                return next;
              })
            }
            value={formState.reviewStatus}
          >
            <option value="">Any review status</option>
            <option value="UNREVIEWED">{REVIEW_STATUS_LABELS.UNREVIEWED}</option>
            <option value="REVIEWED">{REVIEW_STATUS_LABELS.REVIEWED}</option>
            <option value="SUGGESTED_EXCLUSION">{REVIEW_STATUS_LABELS.SUGGESTED_EXCLUSION}</option>
            <option value="CONFIRMED_EXCLUSION">{REVIEW_STATUS_LABELS.CONFIRMED_EXCLUSION}</option>
          </select>
          <select
            className="select"
            name="year"
            onChange={(event) =>
              setFormState((current) => {
                const next = { ...current, year: event.target.value };
                applyFilters({
                  mode,
                  preservedParams,
                  state: next,
                  pathname,
                  currentSearch: searchParams.toString(),
                  router,
                  startTransition,
                });
                return next;
              })
            }
            value={formState.year}
          >
            <option value="">Any year</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            className="select"
            name="month"
            onChange={(event) =>
              setFormState((current) => {
                const next = { ...current, month: event.target.value };
                applyFilters({
                  mode,
                  preservedParams,
                  state: next,
                  pathname,
                  currentSearch: searchParams.toString(),
                  router,
                  startTransition,
                });
                return next;
              })
            }
            value={formState.month}
          >
            <option value="">Any month</option>
            {MONTH_OPTIONS.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </>
      ) : null}

      <input
        className="input"
        name="startDate"
        onChange={(event) =>
          setFormState((current) => {
            const next = { ...current, startDate: event.target.value };
            applyFilters({
              mode,
              preservedParams,
              state: next,
              pathname,
              currentSearch: searchParams.toString(),
              router,
              startTransition,
            });
            return next;
          })
        }
        type="date"
        value={formState.startDate}
      />
      <input
        className="input"
        name="endDate"
        onChange={(event) =>
          setFormState((current) => {
            const next = { ...current, endDate: event.target.value };
            applyFilters({
              mode,
              preservedParams,
              state: next,
              pathname,
              currentSearch: searchParams.toString(),
              router,
              startTransition,
            });
            return next;
          })
        }
        type="date"
        value={formState.endDate}
      />

      {mode === "review" ? (
        <label className="filter-checkbox transaction-filter-checkbox">
          <input
            name="suggestedOnly"
            checked={formState.suggestedOnly}
            onChange={(event) =>
              setFormState((current) => {
                const next = { ...current, suggestedOnly: event.target.checked };
                applyFilters({
                  mode,
                  preservedParams,
                  state: next,
                  pathname,
                  currentSearch: searchParams.toString(),
                  router,
                  startTransition,
                });
                return next;
              })
            }
            type="checkbox"
            value="true"
          />
          Suggested only
        </label>
      ) : null}

      <div className="filter-actions transaction-filter-actions">
        <button
          className="button-secondary button-secondary-compact"
          onClick={clearFilters}
          type="button"
        >
          Clear filters
        </button>
        <p className="filter-status-text">
          {isPending ? "Updating filters..." : "Filters update automatically."}
        </p>
      </div>
    </form>
  );
}
