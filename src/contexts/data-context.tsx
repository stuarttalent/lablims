"use client";

import { createInitialStore } from "@/data/seed";
import { getTestById } from "@/data/catalogue";
import { persistStore, loadStoredStore } from "@/lib/storage";
import { resolveTestPrice } from "@/lib/pricing";
import { loadStoreFromSupabase } from "@/lib/supabase/load-store";
import type { SupabaseContext } from "@/lib/supabase/persist";
import {
  persistInvoiceInsert,
  persistInvoiceUpdate,
  persistOrderInsert,
  persistOrderLineUpdate,
  persistOrderUpdate,
  persistPatientInsert,
  persistPatientUpdate,
  persistSettingsUpdate,
} from "@/lib/supabase/persist";
import { useAuth } from "@/contexts/auth-context";
import type {
  DemoStore,
  Invoice,
  LabOrder,
  LabSettings,
  MockUser,
  OrderTestLine,
  Patient,
  PaymentMethod,
  InvoiceCurrency,
} from "@/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import { toast } from "sonner";

function nextPatientId(patients: Patient[]): string {
  const nums = patients
    .map((p) => parseInt(p.id.replace(/\D/g, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `P-${max + 1}`;
}

function randomInvoiceNo(): string {
  const n = Math.floor(1000 + Math.random() * 8999);
  const y = new Date().getFullYear();
  return `INV-${y}-${n}`;
}

function syncError(action: string, err: unknown) {
  console.error(`Supabase ${action} failed:`, err);
  toast.error(`Could not save to cloud (${action}).`);
}

function expandSelectedTestIds(
  testIds: string[],
  settings: LabSettings,
): string[] {
  const expanded = new Set<string>();
  for (const id of testIds) {
    const test = getTestById(id, settings);
    if (test?.constituentTestIds?.length) {
      for (const constituentId of test.constituentTestIds) {
        expanded.add(constituentId);
      }
      continue;
    }
    expanded.add(id);
  }
  return [...expanded];
}

function buildInvoiceForOrder(
  order: LabOrder,
  selectedTestIds: string[],
  settings: LabSettings,
  branchId?: string,
): Invoice {
  const uniqueTestIds = expandSelectedTestIds(selectedTestIds, settings);
  const subtotal = uniqueTestIds.reduce(
    (sum, tid) => sum + resolveTestPrice(tid, settings),
    0,
  );
  return {
    id: `inv-${Date.now().toString(36)}`,
    invoiceNumber: randomInvoiceNo(),
    branchId,
    patientId: order.patientId,
    orderId: order.id,
    testIds: uniqueTestIds,
    subtotal,
    discount: 0,
    tax: 0,
    total: subtotal,
    currency: "USD",
    paymentStatus: "Unpaid",
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

type DataContextValue = {
  store: DemoStore;
  hydrated: boolean;
  dataSource: "local" | "supabase";
  resetDemoData: () => void;
  addPatient: (p: Omit<Patient, "id" | "createdAt"> & Partial<Pick<Patient, "id">>) => Patient;
  updatePatient: (id: string, patch: Partial<Patient>) => void;
  addOrder: (
    input: Omit<LabOrder, "id" | "createdAt" | "tests"> & { testIds: string[] },
  ) => Promise<LabOrder>;
  updateOrder: (id: string, patch: Partial<LabOrder>) => void;
  updateOrderLine: (
    orderId: string,
    testId: string,
    patch: Partial<OrderTestLine>,
    options?: {
      amendment?: { reason: string; amendedBy: MockUser };
    },
  ) => void;
  addInvoice: (input: {
    patientId: string;
    orderId?: string;
    testIds: string[];
    discount?: number;
    tax?: number;
    currency?: InvoiceCurrency;
    paymentMethod?: PaymentMethod;
    medicalAidDetails?: Invoice["medicalAidDetails"];
  }) => Invoice;
  updateInvoice: (
    id: string,
    patch: Partial<
      Pick<
        Invoice,
        | "paymentStatus"
        | "paymentMethod"
        | "receiptNumber"
        | "medicalAidDetails"
        | "discount"
        | "tax"
        | "subtotal"
        | "total"
        | "currency"
      >
    >,
  ) => void;
  updateSettings: (patch: Partial<LabSettings>) => void;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    laboratoryId,
    branchId: authBranchId,
    hydrated: authHydrated,
    supabaseEnabled,
  } = useAuth();
  const [store, setStore] = useState<DemoStore>(() => createInitialStore());
  const [hydrated, setHydrated] = useState(false);
  const [dataSource, setDataSource] = useState<"local" | "supabase">("local");
  const supabaseCtxRef = useRef<SupabaseContext | null>(null);

  const useSupabase = supabaseEnabled && Boolean(user && laboratoryId);

  useEffect(() => {
    if (!authHydrated) return;

    let cancelled = false;

    async function load() {
      if (useSupabase && laboratoryId) {
        try {
          const { store: remote, ctx } = await loadStoreFromSupabase(laboratoryId);
          if (!cancelled) {
            supabaseCtxRef.current = ctx;
            setStore(remote);
            setDataSource("supabase");
          }
        } catch (e) {
          console.error("Failed to load from Supabase:", e);
          toast.error("Could not load laboratory data from Supabase.");
          if (!cancelled) {
            supabaseCtxRef.current = null;
            setDataSource("local");
          }
        } finally {
          if (!cancelled) setHydrated(true);
        }
        return;
      }

      supabaseCtxRef.current = null;
      const saved = loadStoredStore();
      startTransition(() => {
        const defaults = createInitialStore();
        if (saved) {
          const normalizedInvoices = (saved.invoices ?? []).map((inv) => ({
            ...inv,
            currency: inv.currency ?? "USD",
          }));
          const settings = {
            ...defaults.settings,
            ...saved.settings,
            catalogueOverrides: {
              ...defaults.settings.catalogueOverrides,
              ...(saved.settings.catalogueOverrides ?? {}),
            },
            customTests: saved.settings.customTests ?? [],
          };
          let next: DemoStore = { ...saved, invoices: normalizedInvoices, settings };
          if (!settings.limsInstanceId) {
            const limsInstanceId = crypto.randomUUID();
            next = { ...saved, settings: { ...settings, limsInstanceId } };
            persistStore(next);
          }
          setStore(next);
        } else {
          const limsInstanceId = crypto.randomUUID();
          const fresh = createInitialStore();
          const next: DemoStore = {
            ...fresh,
            settings: { ...fresh.settings, limsInstanceId },
          };
          persistStore(next);
          setStore(next);
        }
        setDataSource("local");
        setHydrated(true);
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [authHydrated, useSupabase, laboratoryId]);

  const commit = useCallback((updater: (s: DemoStore) => DemoStore) => {
    setStore((s) => {
      const next = updater(s);
      if (!useSupabase) persistStore(next);
      return next;
    });
  }, [useSupabase]);

  const resetDemoData = useCallback(() => {
    if (useSupabase) {
      toast.message("Reset is not available while using Supabase.", {
        description: "Manage data in the Supabase dashboard or SQL editor.",
      });
      return;
    }
    const fresh = createInitialStore();
    const next: DemoStore = {
      ...fresh,
      settings: { ...fresh.settings, limsInstanceId: crypto.randomUUID() },
    };
    setStore(next);
    persistStore(next);
  }, [useSupabase]);

  const addPatient = useCallback(
    (
      input: Omit<Patient, "id" | "createdAt"> & Partial<Pick<Patient, "id">>,
    ) => {
      let created: Patient | null = null;
      commit((s) => {
        const id = input.id ?? nextPatientId(s.patients);
        created = {
          ...input,
          id,
          branchId: input.branchId ?? authBranchId ?? undefined,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        return { ...s, patients: [...s.patients, created] };
      });
      const ctx = supabaseCtxRef.current;
      if (ctx && created) {
        void persistPatientInsert(ctx, created).catch((e) =>
          syncError("add patient", e),
        );
      }
      return created!;
    },
    [commit, authBranchId],
  );

  const updatePatient = useCallback(
    (id: string, patch: Partial<Patient>) => {
      commit((s) => ({
        ...s,
        patients: s.patients.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
      const ctx = supabaseCtxRef.current;
      if (ctx) {
        void persistPatientUpdate(ctx, id, patch).catch((e) =>
          syncError("update patient", e),
        );
      }
    },
    [commit],
  );

  const addOrder = useCallback(
    async (
      input: Omit<LabOrder, "id" | "createdAt" | "tests"> & { testIds: string[] },
    ) => {
      let order: LabOrder | null = null;
      let invoice: Invoice | null = null;
      commit((s) => {
        const id = `ORD-${Date.now().toString().slice(-8)}`;
        const uniqueTestIds = expandSelectedTestIds(input.testIds, s.settings);
        const tests: OrderTestLine[] = uniqueTestIds.map((testId) => ({
          testId,
          resultStatus: "Draft",
        }));
        order = {
          id,
          branchId: input.branchId ?? authBranchId ?? undefined,
          patientId: input.patientId,
          sampleType: input.sampleType,
          priority: input.priority,
          requestingDoctor: input.requestingDoctor,
          collectionDate: input.collectionDate,
          status: input.status ?? "Requested",
          notes: input.notes,
          assignedTechId: input.assignedTechId,
          assignedScientistId: input.assignedScientistId,
          createdAt: new Date().toISOString().slice(0, 16),
          tests,
        };
        invoice = buildInvoiceForOrder(
          order,
          input.testIds,
          s.settings,
          order.branchId,
        );
        return {
          ...s,
          orders: [...s.orders, order],
          invoices: [...s.invoices, invoice],
        };
      });
      const ctx = supabaseCtxRef.current;
      if (ctx && order) {
        try {
          await persistOrderInsert(ctx, order);
          if (invoice) {
            await persistInvoiceInsert(ctx, invoice);
          }
        } catch (e) {
          syncError("add order", e);
        }
      }
      return order!;
    },
    [commit, authBranchId],
  );

  const updateOrder = useCallback(
    (id: string, patch: Partial<LabOrder>) => {
      commit((s) => ({
        ...s,
        orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      }));
      const ctx = supabaseCtxRef.current;
      if (ctx) {
        void persistOrderUpdate(ctx, id, patch).catch((e) =>
          syncError("update order", e),
        );
      }
    },
    [commit],
  );

  const updateOrderLine = useCallback(
    (
      orderId: string,
      testId: string,
      patch: Partial<OrderTestLine>,
      options?: { amendment?: { reason: string; amendedBy: MockUser } },
    ) => {
      let persistPatch: Partial<OrderTestLine> = patch;
      commit((s) => ({
        ...s,
        orders: s.orders.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            tests: o.tests.map((t) => {
              if (t.testId !== testId) return t;
              let next: OrderTestLine = { ...t, ...patch };
              if (options?.amendment) {
                const entry = {
                  at: new Date().toISOString().slice(0, 16).replace("T", " "),
                  amendedBy: options.amendment.amendedBy.name,
                  amendedByRole: options.amendment.amendedBy.role,
                  reason: options.amendment.reason,
                };
                next = {
                  ...next,
                  amendments: [...(t.amendments ?? []), entry],
                };
              }
              persistPatch = options?.amendment
                ? { ...patch, amendments: next.amendments }
                : patch;
              return next;
            }),
          };
        }),
      }));
      const ctx = supabaseCtxRef.current;
      if (ctx) {
        void persistOrderLineUpdate(ctx, orderId, testId, persistPatch).catch((e) =>
          syncError("update result", e),
        );
      }
    },
    [commit],
  );

  const addInvoice = useCallback(
    (input: {
      patientId: string;
      orderId?: string;
      testIds: string[];
      discount?: number;
      tax?: number;
      currency?: InvoiceCurrency;
      paymentMethod?: PaymentMethod;
      medicalAidDetails?: Invoice["medicalAidDetails"];
    }) => {
      let inv: Invoice | null = null;
      let createdOrder: LabOrder | null = null;
      commit((s) => {
        const uniqueTestIds = expandSelectedTestIds(input.testIds, s.settings);
        const effectiveOrderId = input.orderId ?? `ORD-${Date.now().toString().slice(-8)}`;
        if (!input.orderId) {
          createdOrder = {
            id: effectiveOrderId,
            branchId: authBranchId ?? undefined,
            patientId: input.patientId,
            sampleType: "Serum",
            priority: "Routine",
            requestingDoctor:
              s.patients.find((p) => p.id === input.patientId)?.referringDoctor ?? "",
            collectionDate: new Date().toISOString().slice(0, 16),
            status: "Requested",
            createdAt: new Date().toISOString().slice(0, 16),
            tests: uniqueTestIds.map((testId) => ({ testId, resultStatus: "Draft" })),
          };
        }
        const subtotal = uniqueTestIds.reduce(
          (sum, tid) => sum + resolveTestPrice(tid, s.settings),
          0,
        );
        const discount = input.discount ?? 0;
        const tax = input.tax ?? 0;
        const total = Math.max(0, subtotal - discount + tax);
        inv = {
          id: `inv-${Date.now().toString(36)}`,
          invoiceNumber: randomInvoiceNo(),
          branchId: authBranchId ?? undefined,
          patientId: input.patientId,
          orderId: effectiveOrderId,
          testIds: uniqueTestIds,
          subtotal,
          discount,
          tax,
          total,
          currency: input.currency ?? "USD",
          paymentMethod: input.paymentMethod,
          paymentStatus: "Unpaid",
          medicalAidDetails: input.medicalAidDetails,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        return {
          ...s,
          orders: createdOrder ? [...s.orders, createdOrder] : s.orders,
          invoices: [...s.invoices, inv],
        };
      });
      const ctx = supabaseCtxRef.current;
      if (ctx && inv) {
        void (async () => {
          try {
            if (createdOrder) {
              await persistOrderInsert(ctx, createdOrder);
            }
            await persistInvoiceInsert(ctx, inv);
          } catch (e) {
            syncError("add invoice", e);
          }
        })();
      }
      return inv!;
    },
    [commit, authBranchId],
  );

  const updateInvoice = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          Invoice,
          | "paymentStatus"
          | "paymentMethod"
          | "receiptNumber"
          | "medicalAidDetails"
          | "discount"
          | "tax"
          | "subtotal"
          | "total"
          | "currency"
        >
      >,
    ) => {
      commit((s) => ({
        ...s,
        invoices: s.invoices.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      }));
      const ctx = supabaseCtxRef.current;
      if (ctx) {
        void persistInvoiceUpdate(ctx, id, patch).catch((e) =>
          syncError("update invoice", e),
        );
      }
    },
    [commit],
  );

  const updateSettings = useCallback(
    (patch: Partial<LabSettings>) => {
      let nextCustom: LabSettings["customTests"] | undefined;
      commit((s) => {
        const next = { ...s.settings, ...patch };
        nextCustom = patch.customTests ?? next.customTests;
        return { ...s, settings: next };
      });
      if (laboratoryId && useSupabase) {
        void persistSettingsUpdate(laboratoryId, patch).catch((e) =>
          syncError("update settings", e),
        );
        if (patch.customTests) {
          void import("@/lib/supabase/ensure-catalogue").then(({ ensureCatalogueTestsForLaboratory }) =>
            ensureCatalogueTestsForLaboratory(laboratoryId, nextCustom).catch((e) =>
              syncError("sync catalogue", e),
            ),
          );
        }
      }
    },
    [commit, laboratoryId, useSupabase],
  );

  const value = useMemo(
    () => ({
      store,
      hydrated,
      dataSource,
      resetDemoData,
      addPatient,
      updatePatient,
      addOrder,
      updateOrder,
      updateOrderLine,
      addInvoice,
      updateInvoice,
      updateSettings,
    }),
    [
      store,
      hydrated,
      dataSource,
      resetDemoData,
      addPatient,
      updatePatient,
      addOrder,
      updateOrder,
      updateOrderLine,
      addInvoice,
      updateInvoice,
      updateSettings,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
