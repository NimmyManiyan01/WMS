import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, FileText, AlertTriangle, ArrowRight } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/po/$code")({
  component: PoPdfViewer,
});

function PoPdfViewer() {
  const { code } = Route.useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [poData, setPoData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadPo() {
      try {
        if (!code) throw new Error("No PO access code provided");

        const authData = await api.magicLogin(code);
        const poId = authData?.poId || authData?.po_id || authData?.poId_str || authData?.po_id_str;
        if (!poId) throw new Error("Could not extract PO ID from link");

        const data = await api.getPurchaseOrder(poId);
        setPoData(data);
      } catch (err: any) {
        console.error("Failed to load PO:", err);
        setErrorMsg(err.message || "Failed to load Purchase Order");
      } finally {
        setLoading(false);
      }
    }
    loadPo();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F8FF] flex flex-col items-center justify-center p-4">
        <Loader2 className="size-8 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-600 font-medium">Loading Purchase Order...</p>
      </div>
    );
  }

  if (errorMsg || !poData) {
    return (
      <div className="min-h-screen bg-[#F5F8FF] flex flex-col items-center justify-center p-4">
        <div className="rounded-2xl border border-[#DCE6F3] bg-white p-8 shadow-sm max-w-md text-center">
          <AlertTriangle className="size-10 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p className="text-slate-600 mb-6">{errorMsg}</p>
          <Button onClick={() => navigate({ to: "/login" })}>Return to Login</Button>
        </div>
      </div>
    );
  }

  // Format the values
  const dateStr = poData.createdAt ? new Date(poData.createdAt).toISOString().split("T")[0] : "N/A";
  const items = poData.items || [];

  return (
    <main className="min-h-screen bg-[#F5F8FF] px-4 py-6 sm:px-8 sm:py-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#0B2A55] p-5 text-white shadow-sm sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10">
              <FileText className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-blue-100">Warehub 360° Procurement</p>
              <h1 className="mt-1 break-words text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Purchase Order {poData.poNumber}
              </h1>
            </div>
          </div>
          <Button
            onClick={() => navigate({ to: `/supplier/asns/new?poId=${poData.id}` })}
            className="h-10 rounded-xl bg-[#0866FF] font-semibold text-white hover:bg-[#0054D6] print:hidden"
          >
            Create ASN <ArrowRight className="size-4" />
          </Button>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)] print:grid-cols-1">
          <div className="min-w-0 space-y-6">
            <section className="overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white shadow-sm">
              <h2 className="border-b border-[#DCE6F3] px-5 py-4 text-base font-bold text-[#101D3A] sm:px-6">
                Order details
              </h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 p-5 sm:p-6">
                {[
                  ["Order date", dateStr],
                  ["Expected delivery", poData.expectedDeliveryDate],
                  ["Supplier", poData.supplier?.name || poData.supplierName],
                  ["Status", poData.status],
                  ["Payment terms", poData.paymentTerms || "Net 30"],
                  ["Delivery terms", poData.deliveryTerms],
                  [
                    "Supplier address",
                    poData.supplier?.address || poData.supplierAddress || poData.supplier_address,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className={
                      label === "Supplier address"
                        ? "col-span-2 min-w-0 border-t border-[#DCE6F3] pt-4"
                        : "min-w-0"
                    }
                  >
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[#526580]">
                      {label}
                    </dt>
                    <dd className="mt-1 break-words whitespace-pre-line text-sm font-semibold text-[#101D3A]">
                      {value || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white shadow-sm">
              <h2 className="border-b border-[#DCE6F3] px-5 py-4 text-base font-bold text-[#101D3A] sm:px-6">
                Line items
              </h2>
              <div
                className="overflow-x-auto"
                tabIndex={0}
                role="region"
                aria-label="Purchase order line items"
              >
                <table className="w-full min-w-[540px] text-left text-sm tabular-nums">
                  <thead className="bg-[#F5F8FF] text-[#526580]">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">Material</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-center">UOM</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-slate-500">
                          No items found
                        </td>
                      </tr>
                    ) : (
                      items.map((it: any, i: number) => {
                        const matCode = it.material?.code || it.materialCode || it.itemCode || "—";
                        const matName = it.material?.name || it.materialName || "";
                        return (
                          <tr key={i} className="border-b border-[#DCE6F3] last:border-b-0">
                            <td className="p-3 text-center text-slate-500">{i + 1}</td>
                            <td className="p-3 font-mono text-slate-700">{matCode}</td>
                            <td className="p-3 text-slate-800 font-medium">{matName}</td>
                            <td className="p-3 text-right text-slate-800">
                              {Number(it.quantity).toFixed(2)}
                            </td>
                            <td className="p-3 text-center text-slate-600">
                              {it.uom || it.material?.uom || ""}
                            </td>
                            <td className="p-3 text-right text-slate-800">
                              INR{" "}
                              {Number(it.unitPrice).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="p-3 text-right text-slate-900 font-medium">
                              INR{" "}
                              {Number(it.lineTotal || it.quantity * it.unitPrice).toLocaleString(
                                "en-IN",
                                { minimumFractionDigits: 2 },
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white text-sm shadow-sm">
            <h2 className="bg-[#0866FF] px-5 py-4 text-base font-bold text-white">Order summary</h2>
            <div className="flex justify-between gap-4 border-b border-[#DCE6F3] px-5 py-3 tabular-nums">
              <span className="text-slate-600">Subtotal</span>
              <span className="text-slate-800 font-medium">
                INR {Number(poData.subtotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#DCE6F3] px-5 py-3 tabular-nums">
              <span className="text-slate-600">Discount</span>
              <span className="text-slate-800 font-medium">
                - INR{" "}
                {Number(poData.discountAmount).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#DCE6F3] px-5 py-3 tabular-nums">
              <span className="text-slate-600">GST (18.0000%)</span>
              <span className="text-slate-800 font-medium">
                INR {Number(poData.taxAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#DCE6F3] px-5 py-3 tabular-nums">
              <span className="text-slate-600">Freight charges</span>
              <span className="text-slate-800 font-medium">
                INR{" "}
                {Number(poData.freightCharges || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#DCE6F3] px-5 py-3 tabular-nums">
              <span className="text-slate-600">Additional charges</span>
              <span className="text-slate-800 font-medium">
                INR{" "}
                {Number(poData.additionalCharges || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 bg-[#EBF3FF] px-5 py-4 font-bold tabular-nums text-[#0866FF]">
              <span>Grand Total</span>
              <span className="text-xl">
                INR{" "}
                {Number(poData.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <div className="px-2 text-center">
          <p className="text-xs text-slate-500">
            This purchase order is generated from backend procurement records. Amounts reflect the
            approved PO values stored in Warehub 360 degree.
          </p>
        </div>
      </div>
    </main>
  );
}
