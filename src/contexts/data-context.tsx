"use client";

import { createInitialStore } from "@/data/seed";
import { persistStore, loadStoredStore } from "@/lib/storage";
import { resolveTestPrice } from "@/lib/pricing";
import type {
  DemoStore,
  Invoice,
  LabOrder,
  LabSettings,
  OrderTestLine,
  Patient,
  PaymentMethod,
} from "@/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react";

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

type DataContextValue = {
  store: DemoStore;
  hydrated: boolean;
  resetDemoData: () => void;
  addPatient: (p: Omit<Patient, "id" | "createdAt"> & Partial<Pick<Patient, "id">>) => Patient;
  updatePatient: (id: string, patch: Partial<Patient>) => void;
  addOrder: (input: Omit<LabOrder, "id" | "createdAt" | "tests"> & { testIds: string[] }) => LabOrder;
  updateOrder: (id: string, patch: Partial<LabOrder>) => void;
  updateOrderLine: (
    orderId: string,
    testId: string,
    patch: Partial<OrderTestLine>,
  ) => void;
  addInvoice: (input: {
    patientId: string;
    orderId?: string;
    testIds: string[];
    discount?: number;
    tax?: number;
    paymentMethod?: PaymentMethod;
  }) => Invoice;
  updateInvoice: (
    id: string,
    patch: Partial<
      Pick<
        Invoice,
        | "paymentStatus"
        | "paymentMethod"
        | "receiptNumber"
        | "discount"
        | "tax"
        | "subtotal"
        | "total"
      >
    >,
  ) => void;
  updateSettings: (patch: Partial<LabSettings>) => void;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<DemoStore>(() => createInitialStore());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadStoredStore();
    startTransition(() => {
      if (saved) setStore(saved);
      setHydrated(true);
    });
  }, []);

  const commit = useCallback((updater: (s: DemoStore) => DemoStore) => {
    setStore((s) => {
      const next = updater(s);
      persistStore(next);
      return next;
    });
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = createInitialStore();
    setStore(fresh);
    persistStore(fresh);
  }, []);

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
          createdAt: new Date().toISOString().slice(0, 10),
        };
        return { ...s, patients: [...s.patients, created] };
      });
      return created!;
    },
    [commit],
  );

  const updatePatient = useCallback(
    (id: string, patch: Partial<Patient>) => {
      commit((s) => ({
        ...s,
        patients: s.patients.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
    },
    [commit],
  );

  const addOrder = useCallback(
    (
      input: Omit<LabOrder, "id" | "createdAt" | "tests"> & { testIds: string[] },
    ) => {
      let order: LabOrder | null = null;
      commit((s) => {
        const id = `ORD-${Date.now().toString().slice(-8)}`;
        const tests: OrderTestLine[] = input.testIds.map((testId) => ({
          testId,
          resultStatus: "Draft",
        }));
        order = {
          id,
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
        return { ...s, orders: [...s.orders, order] };
      });
      return order!;
    },
    [commit],
  );

  const updateOrder = useCallback(
    (id: string, patch: Partial<LabOrder>) => {
      commit((s) => ({
        ...s,
        orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      }));
    },
    [commit],
  );

  const updateOrderLine = useCallback(
    (orderId: string, testId: string, patch: Partial<OrderTestLine>) => {
      commit((s) => ({
        ...s,
        orders: s.orders.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            tests: o.tests.map((t) =>
              t.testId === testId ? { ...t, ...patch } : t,
            ),
          };
        }),
      }));
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
      paymentMethod?: PaymentMethod;
    }) => {
      let inv: Invoice | null = null;
      commit((s) => {
        const subtotal = input.testIds.reduce(
          (sum, tid) => sum + resolveTestPrice(tid, s.settings),
          0,
        );
        const discount = input.discount ?? 0;
        const tax = input.tax ?? 0;
        const total = Math.max(0, subtotal - discount + tax);
        inv = {
          id: `inv-${Date.now().toString(36)}`,
          invoiceNumber: randomInvoiceNo(),
          patientId: input.patientId,
          orderId: input.orderId,
          testIds: input.testIds,
          subtotal,
          discount,
          tax,
          total,
          paymentMethod: input.paymentMethod,
          paymentStatus: "Unpaid",
          createdAt: new Date().toISOString().slice(0, 10),
        };
        return { ...s, invoices: [...s.invoices, inv] };
      });
      return inv!;
    },
    [commit],
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
          | "discount"
          | "tax"
          | "subtotal"
          | "total"
        >
      >,
    ) => {
      commit((s) => ({
        ...s,
        invoices: s.invoices.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      }));
    },
    [commit],
  );

  const updateSettings = useCallback(
    (patch: Partial<LabSettings>) => {
      commit((s) => ({
        ...s,
        settings: { ...s.settings, ...patch },
      }));
    },
    [commit],
  );

  const value = useMemo(
    () => ({
      store,
      hydrated,
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
