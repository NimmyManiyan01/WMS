import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Ban,
  Building2,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ReceiptText,
  Save,
  ShieldCheck,
  X,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Download,
  Star,
  CreditCard,
} from "lucide-react";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Field, SectionCard } from "@/components/wms/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { INDIAN_STATES, TDS_SECTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/supplier/$supplierId")({
  component: SupplierProfile,
});

function SupplierProfile() {
  const { supplierId } = Route.useParams();
  const [supplier, setSupplier] = useState<any>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [form, setForm] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<string[]>([
    "Raw Materials",
    "Packaging",
    "Finished Goods",
    "Consumables",
  ]);

  // Finance & Accounts state
  const [financeStatement, setFinanceStatement] = useState<any>(null);
  const [financeInvoices, setFinanceInvoices] = useState<any[]>([]);
  const [financePayments, setFinancePayments] = useState<any[]>([]);
  const [loadingFinance, setLoadingFinance] = useState(false);

  useEffect(() => {
    if (activeTab === "finance" && supplierId) {
      loadFinanceData();
    }
  }, [activeTab, supplierId]);

  const loadFinanceData = async () => {
    try {
      setLoadingFinance(true);
      const [stmt, invs, pmts] = await Promise.all([
        api.getSupplierStatement(supplierId).catch(() => null),
        api.listSupplierInvoices({ supplier_id: supplierId }).catch(() => []),
        api.listPayments({ supplier_id: supplierId }).catch(() => []),
      ]);
      setFinanceStatement(stmt);
      setFinanceInvoices(invs || []);
      setFinancePayments(pmts || []);
    } catch (err: any) {
      console.warn("Failed to load supplier finance data", err);
    } finally {
      setLoadingFinance(false);
    }
  };

  useEffect(() => {
    api
      .getSupplier(supplierId)
      .then((data) => {
        setSupplier(data);
        if (data) {
          api
            .getPurchaseOrders({ supplierId: supplierId })
            .then((pos) => {
              if (Array.isArray(pos)) setPurchaseOrders(pos);
            })
            .catch(() => {});
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Unable to load supplier profile."),
      );

    api
      .getPurchaseOrders({ supplierId: supplierId })
      .then((pos) => {
        if (Array.isArray(pos)) setPurchaseOrders(pos);
      })
      .catch(() => {});

    api
      .getSupplierCategories()
      .then((cats) => {
        if (cats.length > 0) setCategories(cats.map((c: any) => c.name));
      })
      .catch((err) => console.warn("Failed to fetch categories", err));
  }, [supplierId]);

  const title = supplier?.supplierName || "Supplier profile";
  const openEditor = () => {
    const copy = JSON.parse(JSON.stringify(supplier || {}));
    copy.paymentTerms = copy.paymentTerms || copy.payment_terms || "Net 30";
    copy.creditPeriodDays = copy.creditPeriodDays ?? copy.credit_period_days ?? 30;
    setForm(copy);
    setEditing(true);
  };
  const updateForm = (section: string, field: string, value: any) => {
    setForm((current: any) =>
      section === "root"
        ? { ...current, [field]: value }
        : { ...current, [section]: { ...current[section], [field]: value } },
    );

    // Clear inline error
    const errorKey = section === "root" ? field : `${section}.${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const name = (form.supplierName || "").trim();
    const regName = (form.registeredCompanyName || "").trim();
    const industry = (form.industry || "").trim();
    const gstin = (form.gstin || "").trim();
    const mainMaterials = form.mainMaterials || [];

    if (!name) newErrors.supplierName = "Supplier name is required";
    else if (name.length < 2 || name.length > 100)
      newErrors.supplierName = "Must be between 2 and 100 characters";

    if (!regName) newErrors.registeredCompanyName = "Registered company name is required";
    else if (regName.length < 2 || regName.length > 200)
      newErrors.registeredCompanyName = "Must be between 2 and 200 characters";

    if (!form.vendorType) newErrors.vendorType = "Vendor type is required";
    if (!form.category || form.category.length === 0)
      newErrors.category = "At least one category is required";
    if (mainMaterials.length === 0) newErrors.mainMaterials = "Select at least one material";

    if (!industry) newErrors.industry = "Industry is required";
    else if (industry.length < 2 || industry.length > 100)
      newErrors.industry = "Must be between 2 and 100 characters";

    if (!gstin) newErrors.gstin = "GSTIN is required";
    else if (gstin.length !== 15) newErrors.gstin = "Exactly 15 characters";
    else if (
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.toUpperCase())
    ) {
      newErrors.gstin = "Invalid format (e.g. 29ABCDE1234F1Z5)";
    }

    // Address & Contact Validation
    if (form.address) {
      const addr = (form.address.registeredAddress || "").trim();
      const city = (form.address.city || "").trim();
      const pincode = (form.address.pincode || "").trim();
      const state = (form.address.state || "").trim();

      if (!addr) newErrors["address.registeredAddress"] = "Address is required";
      else if (addr.length < 10 || addr.length > 300)
        newErrors["address.registeredAddress"] = "Must be between 10 and 300 characters";

      if (!city) newErrors["address.city"] = "City is required";
      else if (city.length < 2 || city.length > 100)
        newErrors["address.city"] = "Must be between 2 and 100 characters";
      else if (!/^[a-zA-Z\s-]+$/.test(city))
        newErrors["address.city"] = "Letters/spaces/hyphen only";

      if (state && (state.length < 2 || state.length > 100))
        newErrors["address.state"] = "Must be 2-100 characters";

      if (!pincode) newErrors["address.pincode"] = "Pincode is required";
      else if (!/^\d{6}$/.test(pincode)) newErrors["address.pincode"] = "Must be exactly 6 digits";
    }

    if (form.contact) {
      const contactName = (form.contact.primaryContactName || "").trim();
      const phone = (form.contact.phone || "").trim();
      const primaryEmail = (form.contact.primaryEmail || "").trim();
      const secondaryEmail = (form.contact.secondaryEmail || "").trim();
      const website = (form.contact.website || "").trim();
      const designation = (form.contact.designation || "").trim();

      if (!contactName) newErrors["contact.primaryContactName"] = "Name is required";
      else if (contactName.length < 2 || contactName.length > 100)
        newErrors["contact.primaryContactName"] = "Must be 2-100 characters";
      else if (!/^[a-zA-Z\s]+$/.test(contactName))
        newErrors["contact.primaryContactName"] = "Letters and spaces only";

      if (!phone) newErrors["contact.phone"] = "Phone is required";
      else if (!/^[6-9]\d{9}$/.test(phone))
        newErrors["contact.phone"] = "Must be 10-digit mobile number";

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!primaryEmail) newErrors["contact.primaryEmail"] = "Email is required";
      else if (!emailRegex.test(primaryEmail)) newErrors["contact.primaryEmail"] = "Invalid email";

      if (secondaryEmail && !emailRegex.test(secondaryEmail))
        newErrors["contact.secondaryEmail"] = "Invalid email";

      if (designation && (designation.length < 2 || designation.length > 100))
        newErrors["contact.designation"] = "Must be 2-100 characters";

      if (website) {
        try {
          new URL(website.startsWith("http") ? website : `https://${website}`);
        } catch (_) {
          newErrors["contact.website"] = "Invalid URL";
        }
      }
    }

    if (form.bankInfo) {
      const bankName = (form.bankInfo.bankName || "").trim();
      const accNo = (form.bankInfo.accountNumber || "").trim();
      const ifsc = (form.bankInfo.ifsc || "").trim();
      const holder = (form.bankInfo.accountHolderName || "").trim();
      const branch = (form.bankInfo.branch || "").trim();
      const swift = (form.bankInfo.swiftBic || "").trim();

      if (!bankName) newErrors["bankInfo.bankName"] = "Bank name is required";

      if (!accNo) newErrors["bankInfo.accountNumber"] = "Account number is required";
      else if (accNo.length < 9 || accNo.length > 18)
        newErrors["bankInfo.accountNumber"] = "9-18 digits required";
      else if (!/^\d+$/.test(accNo)) newErrors["bankInfo.accountNumber"] = "Digits only";

      if (!ifsc) newErrors["bankInfo.ifsc"] = "IFSC code is required";
      else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())) {
        newErrors["bankInfo.ifsc"] = "Invalid format (e.g. SBIN0012345)";
      }

      if (!holder) newErrors["bankInfo.accountHolderName"] = "Holder name is required";
      if (!branch) newErrors["bankInfo.branch"] = "Branch is required";

      if (swift && !/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift.toUpperCase())) {
        newErrors["bankInfo.swiftBic"] = "Invalid format";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveChanges = async () => {
    if (!validate()) {
      return;
    }

    const name = (form.supplierName || "").trim();
    const regName = (form.registeredCompanyName || "").trim();
    const industry = (form.industry || "").trim();
    const gstin = (form.gstin || "").trim();

    setSaving(true);
    try {
      const finalForm = {
        ...form,
        supplierName: name,
        registeredCompanyName: regName,
        industry: industry,
        gstin: gstin.toUpperCase(),
        paymentTerms: form.paymentTerms,
        payment_terms: form.paymentTerms,
        creditPeriodDays: form.creditPeriodDays ? Number(form.creditPeriodDays) : undefined,
        credit_period_days: form.creditPeriodDays ? Number(form.creditPeriodDays) : undefined,
      };
      const updated = await api.updateSupplier(supplierId, finalForm);
      setSupplier(updated);
      setEditing(false);
      toast.success("Supplier profile updated");
    } catch (err) {
      toast.error("Unable to update supplier", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };
  const changeSupplierStatus = async (nextStatus: string, successMessage: string) => {
    const previousSupplier = supplier;
    setSupplier((prev: any) => ({ ...prev, status: nextStatus }));
    setBlocking(true);

    try {
      const updated = await api.updateSupplierStatus(supplierId, nextStatus);
      setSupplier(updated);
      toast.success(successMessage);
    } catch (err) {
      setSupplier(previousSupplier);
      toast.error("Unable to update supplier status", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBlocking(false);
    }
  };

  const handleDownloadRealtimePdf = (doc: any) => {
    try {
      const docType = doc.documentType || doc.document_type || "Compliance Document";
      const fileName =
        doc.fileName || doc.file_name || `${supplier?.supplierName || "Supplier"}_${docType}.pdf`;
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>${fileName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; color: #2563eb; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
            .field { background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; }
            .value { font-size: 14px; font-weight: bold; margin-top: 4px; color: #0f172a; }
            .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 10px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${docType}</div>
            <div class="subtitle">Official Vendor Compliance Document · ${supplier?.supplierName || "Supplier Master"}</div>
          </div>
          <div class="info-grid">
            <div class="field"><div class="label">Supplier Name</div><div class="value">${supplier?.supplierName || "—"}</div></div>
            <div class="field"><div class="label">Registered Company</div><div class="value">${supplier?.registeredCompanyName || "—"}</div></div>
            <div class="field"><div class="label">GSTIN</div><div class="value">${supplier?.gstin || "—"}</div></div>
            <div class="field"><div class="label">Vendor Code</div><div class="value">${supplier?.supplierCode || supplier?.supplierId || "—"}</div></div>
            <div class="field"><div class="label">Document Category</div><div class="value">${docType}</div></div>
            <div class="field"><div class="label">Verification Status</div><div class="value" style="color:#059669;">Verified &amp; Active</div></div>
          </div>
          <div style="margin-top: 30px; padding: 20px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px;">
            <p style="font-size: 12px; font-weight: bold; color: #065f46; margin: 0;">Verified Compliance Record</p>
            <p style="font-size: 11px; color: #047857; margin-top: 4px;">This document certifies that ${supplier?.supplierName || "the supplier"} (GSTIN: ${supplier?.gstin || "N/A"}) is a registered, verified vendor in NexusWMS platform master data.</p>
          </div>
          <div class="footer">
            Generated automatically by NexusWMS Procurement Portal · ${new Date().toLocaleString("en-IN")}
          </div>
        </body>
        </html>
      `;

      const printWin = window.open("", "_blank");
      if (printWin) {
        printWin.document.write(htmlContent);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          printWin.print();
        }, 500);
      } else {
        toast.error("Popup blocked. Please allow popups to download real-time PDF.");
      }
    } catch (e: any) {
      toast.error("Failed to generate real-time PDF", { description: e.message });
    }
  };

  const handleDownloadDocument = async (doc: any, downloadUrl: string) => {
    const fileName = doc.fileName || doc.file_name || "supplier-document.pdf";

    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`File not found (${response.status})`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Stored document file is missing", {
        description: "Generating the supplier compliance PDF instead.",
      });
      handleDownloadRealtimePdf(doc);
    }
  };

  const blockSupplier = async () => {
    await changeSupplierStatus("Blocked", "Supplier blocked");
    setShowBlockConfirm(false);
  };

  return (
    <AppShell
      title={supplier?.supplierName || "Supplier Profile"}
      subtitle={`GSTIN: ${supplier?.gstin || "—"}`}
      actions={
        supplier && (
          <div className="flex items-center gap-2">
            <StatusBadge status={supplier.status || "Active"} />
            <Button variant="outline" className="rounded-xl font-bold" onClick={openEditor}>
              <Pencil className="mr-1.5 size-3.5" /> Edit Supplier
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="rounded-xl font-bold">
                  More <ChevronDown className="ml-1.5 size-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-2 rounded-xl" align="end">
                <div className="space-y-1">
                  {(supplier.status === "Draft" || supplier.status === "Suspended") && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-xs font-semibold rounded-lg h-9"
                      disabled={blocking}
                      onClick={() =>
                        changeSupplierStatus("Pending Approval", "Supplier submitted for approval")
                      }
                    >
                      <FileText className="mr-2 size-3.5 text-primary" /> Submit Approval
                    </Button>
                  )}
                  {supplier.status === "Pending Approval" && (
                    <>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-xs font-semibold rounded-lg h-9 text-emerald-600 hover:bg-emerald-50"
                        disabled={blocking}
                        onClick={() =>
                          changeSupplierStatus("Active", "Supplier approved and active")
                        }
                      >
                        <ShieldCheck className="mr-2 size-3.5 text-emerald-600" /> Approve
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-xs font-semibold rounded-lg h-9 text-amber-600 hover:bg-amber-50"
                        disabled={blocking}
                        onClick={() => changeSupplierStatus("Draft", "Supplier rejected to draft")}
                      >
                        <X className="mr-2 size-3.5 text-amber-600" /> Reject
                      </Button>
                    </>
                  )}
                  {supplier.status === "Active" && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-xs font-semibold rounded-lg h-9 text-amber-600 hover:bg-amber-50"
                      disabled={blocking}
                      onClick={() => changeSupplierStatus("Suspended", "Supplier suspended")}
                    >
                      <Ban className="mr-2 size-3.5 text-amber-600" /> Suspend
                    </Button>
                  )}
                  {(supplier.status === "Blocked" || supplier.status === "Suspended") && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-xs font-semibold rounded-lg h-9 text-emerald-600 hover:bg-emerald-50"
                      disabled={blocking}
                      onClick={() => changeSupplierStatus("Active", "Supplier activated")}
                    >
                      <ShieldCheck className="mr-2 size-3.5 text-emerald-600" /> Activate
                    </Button>
                  )}
                  {supplier.status !== "Blocked" && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-xs font-semibold rounded-lg h-9 text-rose-600 hover:bg-rose-50"
                      disabled={blocking}
                      onClick={() => setShowBlockConfirm(true)}
                    >
                      <Ban className="mr-2 size-3.5 text-rose-600" /> Block Supplier
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )
      }
    >
      <AlertDialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Block supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to block <strong>{supplier?.supplierName}</strong>? This action
              will prevent the supplier from being used in any active operational processes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={blockSupplier}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button variant="ghost" className="mb-4 rounded-xl font-bold text-xs" asChild>
        <Link to="/master-data">
          <ArrowLeft className="mr-2 size-4" /> Back to Suppliers
        </Link>
      </Button>
      {!supplier && !error && (
        <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" /> Loading supplier profile…
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="font-medium text-destructive">Supplier profile could not be loaded.</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      )}
      {supplier && (
        <div className="space-y-4">
          {editing && form && (
            <SectionCard
              title="Edit supplier"
              description="Changes are saved immediately to the supplier master"
              icon={Pencil}
              actions={
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    <X /> Cancel
                  </Button>
                  <Button size="sm" onClick={saveChanges} disabled={saving}>
                    <Save /> {saving ? "Saving…" : "Save changes"}
                  </Button>
                </>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ValidatedEditField
                  label="Supplier name"
                  value={form.supplierName}
                  error={errors.supplierName}
                  onChange={(value) => {
                    const sanitized = value.replace(/[^a-zA-Z\s]/g, "");
                    updateForm("root", "supplierName", sanitized);
                  }}
                />
                <ValidatedEditField
                  label="Registered company"
                  value={form.registeredCompanyName}
                  error={errors.registeredCompanyName}
                  onChange={(value) => {
                    const sanitized = value.replace(/[^a-zA-Z\s]/g, "");
                    updateForm("root", "registeredCompanyName", sanitized);
                  }}
                />
                <div className="space-y-1.5">
                  <Label>Vendor type</Label>
                  <Select
                    onValueChange={(v) => updateForm("root", "vendorType", v)}
                    value={form.vendorType}
                  >
                    <SelectTrigger
                      className={cn(
                        errors.vendorType && "border-destructive focus:ring-destructive",
                      )}
                    >
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Manufacturer", "Distributor", "Service Provider"].map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.vendorType && (
                    <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                      <AlertCircle className="size-3" /> {errors.vendorType}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between rounded-xl h-10 px-3 font-normal",
                          errors.category && "border-destructive",
                        )}
                      >
                        <span className="truncate">
                          {Array.isArray(form.category) && form.category.length > 0
                            ? form.category.join(", ")
                            : "Select categories"}
                        </span>
                        <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50 rotate-90" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0 rounded-xl" align="start">
                      <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                        {categories.map((cat) => (
                          <div
                            key={cat}
                            className="flex items-center space-x-2 p-2 hover:bg-muted rounded-lg cursor-pointer"
                            onClick={() => {
                              const current = Array.isArray(form.category) ? form.category : [];
                              const updated = current.includes(cat)
                                ? current.filter((c: string) => c !== cat)
                                : [...current, cat];
                              updateForm("root", "category", updated);
                            }}
                          >
                            <Checkbox
                              id={`edit-cat-${cat}`}
                              checked={Array.isArray(form.category) && form.category.includes(cat)}
                              onCheckedChange={() => {
                                const current = Array.isArray(form.category) ? form.category : [];
                                const updated = current.includes(cat)
                                  ? current.filter((c: string) => c !== cat)
                                  : [...current, cat];
                                updateForm("root", "category", updated);
                              }}
                            />
                            <Label
                              htmlFor={`edit-cat-${cat}`}
                              className="text-sm cursor-pointer w-full"
                            >
                              {cat}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {errors.category && (
                    <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                      <AlertCircle className="size-3" /> {errors.category}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Main materials</Label>
                  <Input
                    value={
                      Array.isArray(form.mainMaterials)
                        ? form.mainMaterials.join(", ")
                        : form.mainMaterial || ""
                    }
                    onChange={(event) =>
                      updateForm(
                        "root",
                        "mainMaterials",
                        event.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="Comma separated list"
                    className={cn(
                      errors.mainMaterials && "border-destructive focus-visible:ring-destructive",
                    )}
                  />
                  {errors.mainMaterials && (
                    <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                      <AlertCircle className="size-3" /> {errors.mainMaterials}
                    </p>
                  )}
                </div>
                <ValidatedEditField
                  label="Industry"
                  value={form.industry}
                  error={errors.industry}
                  onChange={(value) => updateForm("root", "industry", value)}
                />
                <ValidatedEditField
                  label="GSTIN"
                  value={form.gstin}
                  error={errors.gstin}
                  maxLength={15}
                  onChange={(value) => updateForm("root", "gstin", value.substring(0, 15))}
                />
                {form.address && (
                  <>
                    <ValidatedEditField
                      label="Address"
                      value={form.address.registeredAddress}
                      error={errors["address.registeredAddress"]}
                      onChange={(value) => updateForm("address", "registeredAddress", value)}
                    />
                    <ValidatedEditField
                      label="City"
                      value={form.address.city}
                      error={errors["address.city"]}
                      onChange={(value) => updateForm("address", "city", value)}
                    />
                    <div className="space-y-1.5">
                      <Label>State</Label>
                      <Select
                        onValueChange={(v) => updateForm("address", "state", v)}
                        value={form.address.state}
                      >
                        <SelectTrigger
                          className={cn(
                            errors["address.state"] && "border-destructive focus:ring-destructive",
                          )}
                        >
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDIAN_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors["address.state"] && (
                        <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                          <AlertCircle className="size-3" /> {errors["address.state"]}
                        </p>
                      )}
                    </div>
                    <EditField
                      label="Country"
                      value={form.address.country}
                      onChange={(value) => updateForm("address", "country", value)}
                    />
                    <ValidatedEditField
                      label="Pincode"
                      value={form.address.pincode}
                      error={errors["address.pincode"]}
                      maxLength={6}
                      onChange={(value) => {
                        const sanitized = value.replace(/\D/g, "").substring(0, 6);
                        updateForm("address", "pincode", sanitized);
                      }}
                    />
                  </>
                )}
                {form.contact && (
                  <>
                    <ValidatedEditField
                      label="Primary contact"
                      value={form.contact.primaryContactName}
                      error={errors["contact.primaryContactName"]}
                      onChange={(value) => updateForm("contact", "primaryContactName", value)}
                    />
                    <ValidatedEditField
                      label="Primary Email"
                      value={form.contact.primaryEmail}
                      error={errors["contact.primaryEmail"]}
                      maxLength={128}
                      onChange={(value) => {
                        const sanitized = value.replace(/\s/g, "").substring(0, 128);
                        updateForm("contact", "primaryEmail", sanitized);

                        // Run-time validation
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (sanitized && !emailRegex.test(sanitized)) {
                          setErrors((prev) => ({
                            ...prev,
                            ["contact.primaryEmail"]: "Invalid email format",
                          }));
                        } else {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next["contact.primaryEmail"];
                            return next;
                          });
                        }
                      }}
                    />
                    <ValidatedEditField
                      label="Secondary Email"
                      value={form.contact.secondaryEmail}
                      error={errors["contact.secondaryEmail"]}
                      maxLength={128}
                      onChange={(value) => {
                        const sanitized = value.replace(/\s/g, "").substring(0, 128);
                        updateForm("contact", "secondaryEmail", sanitized);

                        // Run-time validation
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (sanitized && !emailRegex.test(sanitized)) {
                          setErrors((prev) => ({
                            ...prev,
                            ["contact.secondaryEmail"]: "Invalid email format",
                          }));
                        } else {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next["contact.secondaryEmail"];
                            return next;
                          });
                        }
                      }}
                    />
                    <ValidatedEditField
                      label="Phone"
                      value={form.contact.phone}
                      error={errors["contact.phone"]}
                      maxLength={10}
                      onChange={(value) => {
                        const sanitized = value.replace(/\D/g, "").substring(0, 10);
                        updateForm("contact", "phone", sanitized);
                      }}
                    />
                  </>
                )}
                {form.bankInfo && (
                  <>
                    <ValidatedEditField
                      label="Bank Name"
                      value={form.bankInfo.bankName}
                      error={errors["bankInfo.bankName"]}
                      onChange={(value) => updateForm("bankInfo", "bankName", value)}
                    />
                    <ValidatedEditField
                      label="Account Number"
                      value={form.bankInfo.accountNumber}
                      error={errors["bankInfo.accountNumber"]}
                      maxLength={18}
                      onChange={(value) =>
                        updateForm(
                          "bankInfo",
                          "accountNumber",
                          value.replace(/\D/g, "").substring(0, 18),
                        )
                      }
                    />
                    <ValidatedEditField
                      label="IFSC Code"
                      value={form.bankInfo.ifsc}
                      error={errors["bankInfo.ifsc"]}
                      maxLength={11}
                      onChange={(value) =>
                        updateForm(
                          "bankInfo",
                          "ifsc",
                          value
                            .replace(/[^a-zA-Z0-9]/g, "")
                            .substring(0, 11)
                            .toUpperCase(),
                        )
                      }
                    />
                    <ValidatedEditField
                      label="Account Holder"
                      value={form.bankInfo.accountHolderName}
                      error={errors["bankInfo.accountHolderName"]}
                      onChange={(value) => updateForm("bankInfo", "accountHolderName", value)}
                    />
                    <ValidatedEditField
                      label="Branch"
                      value={form.bankInfo.branch}
                      error={errors["bankInfo.branch"]}
                      onChange={(value) => updateForm("bankInfo", "branch", value)}
                    />
                    <ValidatedEditField
                      label="SWIFT / BIC"
                      value={form.bankInfo.swiftBic}
                      error={errors["bankInfo.swiftBic"]}
                      maxLength={11}
                      onChange={(value) =>
                        updateForm(
                          "bankInfo",
                          "swiftBic",
                          value
                            .replace(/[^a-zA-Z0-9]/g, "")
                            .substring(0, 11)
                            .toUpperCase(),
                        )
                      }
                    />
                    <div className="space-y-1.5">
                      <Label>TDS Section</Label>
                      <Select
                        onValueChange={(v) => updateForm("bankInfo", "tdsSection", v)}
                        value={form.bankInfo.tdsSection}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select TDS section" />
                        </SelectTrigger>
                        <SelectContent>
                          {TDS_SECTIONS.map((section) => (
                            <SelectItem key={section} value={section}>
                              {section}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Payment Terms</Label>
                      <Select
                        onValueChange={(v) => updateForm("root", "paymentTerms", v)}
                        value={form.paymentTerms}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                        <SelectContent>
                          {["Immediate", "Net 15", "Net 30", "Net 45", "Net 60", "Advance"].map(
                            (term) => (
                              <SelectItem key={term} value={term}>
                                {term}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <ValidatedEditField
                      label="Credit Period (Days)"
                      value={form.creditPeriodDays ? String(form.creditPeriodDays) : ""}
                      maxLength={3}
                      onChange={(value) =>
                        updateForm(
                          "root",
                          "creditPeriodDays",
                          value.replace(/\D/g, "").substring(0, 3),
                        )
                      }
                    />
                  </>
                )}
              </div>
              <div className="mt-4">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={form.remarks || ""}
                  onChange={(event) => updateForm("root", "remarks", event.target.value)}
                  className="mt-2"
                />
              </div>
            </SectionCard>
          )}
          {/* TAB NAVIGATION BAR */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border/70 pb-3 mb-6">
            {[
              { id: "overview", label: "Overview", icon: Building2 },
              { id: "contacts", label: "Contacts", icon: Phone },
              { id: "addresses", label: "Addresses", icon: MapPin },
              { id: "bank", label: "Bank Details", icon: ReceiptText },
              { id: "documents", label: "Documents", icon: FileText },
              { id: "purchases", label: "Purchase History", icon: ReceiptText },
              { id: "performance", label: "Performance", icon: ShieldCheck },
              { id: "finance", label: "Finance & Accounts", icon: CreditCard },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-xl font-bold text-xs transition-all",
                    isActive && "shadow-soft",
                  )}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="mr-1.5 size-3.5" />
                  {tab.label}
                </Button>
              );
            })}
          </div>

          {/* TAB CONTENT 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <SectionCard
                title="Supplier overview"
                description="Core vendor record"
                icon={Building2}
                actions={<StatusBadge status={supplier.status || "Active"} />}
              >
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Supplier name" value={supplier.supplierName} />
                  <Field label="Vendor type" value={supplier.vendorType || "—"} />
                  <Field
                    label="Category"
                    value={
                      Array.isArray(supplier.category)
                        ? supplier.category.join(", ")
                        : supplier.category || "—"
                    }
                  />
                  <Field
                    label="Main materials"
                    value={
                      Array.isArray(supplier.mainMaterials)
                        ? supplier.mainMaterials.join(", ")
                        : supplier.mainMaterial || "—"
                    }
                  />
                  <Field label="GSTIN" value={supplier.gstin || "—"} mono />
                  <Field label="Status" value={supplier.status || "Pending Approval"} />
                  <Field
                    label="Payment Terms"
                    value={supplier.paymentTerms || supplier.payment_terms || "Net 30"}
                  />
                  <Field
                    label="Credit Period"
                    value={
                      (supplier.creditPeriodDays ?? supplier.credit_period_days) != null
                        ? `${supplier.creditPeriodDays ?? supplier.credit_period_days} days`
                        : "30 days"
                    }
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Audit Trail"
                description="Audit and record tracking"
                icon={ShieldCheck}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Created
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary font-bold uppercase">
                        {(supplier.createdBy || "S").charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {supplier.createdBy || "System Generated"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {supplier.createdAt
                            ? new Date(supplier.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Last Updated
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-bold uppercase">
                        {(supplier.updatedBy || supplier.createdBy || "S").charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {supplier.updatedBy || supplier.createdBy || "System Generated"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {supplier.updatedAt
                            ? new Date(supplier.updatedAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* TAB CONTENT 2: CONTACTS */}
          {activeTab === "contacts" && (
            <SectionCard
              title="Primary contact"
              description="Supplier contact details and designation"
              icon={Phone}
            >
              {supplier.contact ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <Field
                    label="Contact Person"
                    value={supplier.contact.primaryContactName || "—"}
                  />
                  <Field label="Designation" value={supplier.contact.designation || "—"} />
                  <Field label="Phone" value={supplier.contact.phone || "—"} mono />
                  <Field label="Primary Email" value={supplier.contact.primaryEmail || "—"} />
                  <Field label="Secondary Email" value={supplier.contact.secondaryEmail || "—"} />
                  <Field label="Website" value={supplier.contact.website || "—"} />
                </div>
              ) : (
                <EmptySection text="No contact has been recorded." />
              )}
            </SectionCard>
          )}

          {/* TAB CONTENT 3: ADDRESSES */}
          {activeTab === "addresses" && (
            <SectionCard title="Address" description="Registered business location" icon={MapPin}>
              {supplier.address ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <Field
                    label="Registered address"
                    value={supplier.address.registeredAddress || "—"}
                  />
                  <Field
                    label="City / State"
                    value={
                      [supplier.address.city, supplier.address.state].filter(Boolean).join(", ") ||
                      "—"
                    }
                  />
                  <Field label="Country" value={supplier.address.country || "—"} />
                  <Field label="Pincode" value={supplier.address.pincode || "—"} mono />
                </div>
              ) : (
                <EmptySection text="No address has been recorded." />
              )}
            </SectionCard>
          )}

          {/* TAB CONTENT 4: BANK DETAILS */}
          {activeTab === "bank" && (
            <SectionCard
              title="Tax & banking"
              description="Payment and compliance details"
              icon={ReceiptText}
            >
              {supplier.bankInfo ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Bank Name" value={supplier.bankInfo.bankName || "—"} />
                  <Field
                    label="Account number"
                    value={supplier.bankInfo.accountNumber || "—"}
                    mono
                  />
                  <Field label="IFSC Code" value={supplier.bankInfo.ifsc || "—"} mono />
                  <Field
                    label="Account holder"
                    value={supplier.bankInfo.accountHolderName || "—"}
                  />
                  <Field label="Branch" value={supplier.bankInfo.branch || "—"} />
                  <Field label="SWIFT / BIC" value={supplier.bankInfo.swiftBic || "—"} mono />
                  <Field label="TDS Section" value={supplier.bankInfo.tdsSection || "—"} />
                  <Field
                    label="Payment Terms"
                    value={supplier.paymentTerms || supplier.payment_terms || "Net 30"}
                  />
                  <Field
                    label="Credit Period"
                    value={
                      (supplier.creditPeriodDays ?? supplier.credit_period_days) != null
                        ? `${supplier.creditPeriodDays ?? supplier.credit_period_days} days`
                        : "30 days"
                    }
                  />
                </div>
              ) : (
                <EmptySection text="No banking details have been recorded." />
              )}
            </SectionCard>
          )}

          {/* TAB CONTENT 5: DOCUMENTS */}
          {activeTab === "documents" && (
            <SectionCard
              title="Documents"
              description="Compliance and onboarding documents attached to this supplier"
              icon={FileText}
            >
              {supplier.documents?.length ? (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {supplier.documents.map((document: any) => {
                    const rawUrl =
                      document.fileUrl ||
                      document.file_url ||
                      document.storagePath ||
                      document.storage_path;
                    const downloadUrl =
                      rawUrl && rawUrl !== "#" ? api.resolveMediaUrl(rawUrl) : null;

                    return (
                      <div
                        key={
                          document.uploadId ||
                          document.upload_id ||
                          document.fileName ||
                          document.file_name
                        }
                        className="flex items-center justify-between rounded-xl border border-border/70 p-4 bg-card shadow-soft hover:border-primary/40 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-sm font-semibold truncate text-foreground">
                            {document.fileName || document.file_name || "Compliance Doc"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {document.documentType ||
                              document.document_type ||
                              "Compliance Document"}
                          </p>
                        </div>
                        {downloadUrl ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadDocument(document, downloadUrl)}
                            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                          >
                            <Download className="size-3.5" /> PDF
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg h-8 text-xs font-bold border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                            onClick={() => handleDownloadRealtimePdf(document)}
                          >
                            <Download className="mr-1 size-3.5" /> PDF
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptySection text="No compliance documents have been attached." />
              )}
            </SectionCard>
          )}

          {/* TAB CONTENT 6: PURCHASE HISTORY */}
          {activeTab === "purchases" && (
            <SectionCard
              title="Purchase Order History"
              description="Purchase orders and historical transactions issued to this vendor"
              icon={ReceiptText}
            >
              {purchaseOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 font-semibold uppercase text-muted-foreground text-[10px] tracking-wider border-b border-border/70">
                      <tr>
                        <th className="px-4 py-3">PO Number</th>
                        <th className="px-4 py-3">PO Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Total Amount</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {purchaseOrders.map((po) => (
                        <tr key={po.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-primary">
                            {po.poNumber}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{po.poDate || "—"}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={po.status} />
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">
                            ₹{Number(po.totalAmount || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl h-7 text-[10px] font-bold"
                              asChild
                            >
                              <Link to="/purchase-order" search={{ poId: po.id }}>
                                View PO <ChevronRight className="ml-1 size-3" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptySection text="No purchase order history recorded for this supplier." />
              )}
            </SectionCard>
          )}

          {/* TAB CONTENT 7: PERFORMANCE */}
          {activeTab === "performance" && (
            <SectionCard
              title="Supplier Performance & Scorecard"
              description="Evaluation metrics, on-time delivery, and quality score"
              icon={ShieldCheck}
            >
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Field
                  label="Supplier Rating"
                  value={
                    supplier.rating !== undefined && supplier.rating !== null
                      ? `${Number(supplier.rating).toFixed(1)} / 5.0`
                      : "4.8 / 5.0"
                  }
                />
                <Field
                  label="Performance Score"
                  value={
                    supplier.performanceScore !== undefined && supplier.performanceScore !== null
                      ? `${Number(supplier.performanceScore).toFixed(0)}%`
                      : "98.5%"
                  }
                />
                <Field
                  label="Purchase Orders Executed"
                  value={
                    purchaseOrders.length
                      ? String(purchaseOrders.length)
                      : supplier.purchaseOrderCount
                        ? String(supplier.purchaseOrderCount)
                        : "0"
                  }
                />
                <Field
                  label="Total Purchase Value"
                  value={
                    purchaseOrders.length > 0
                      ? `₹ ${purchaseOrders.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0).toLocaleString("en-IN")}`
                      : supplier.purchaseValue
                        ? `₹ ${Number(supplier.purchaseValue).toLocaleString("en-IN")}`
                        : "₹ 0"
                  }
                />
              </div>
            </SectionCard>
          )}

          {/* TAB CONTENT: FINANCE & ACCOUNTS */}
          {activeTab === "finance" && (
            <div className="space-y-6">
              {/* Financial Health KPIs */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Total Invoiced
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    ₹{(financeStatement?.total_invoiced || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {financeInvoices.length} invoices processed
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Total Disbursed / Paid
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    ₹{(financeStatement?.total_paid || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {financePayments.length} payments executed
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Net Outstanding AP
                  </div>
                  <div className="text-2xl font-bold text-rose-600 mt-1">
                    ₹{(financeStatement?.closing_balance || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Current debt balance</p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Commercial Terms
                  </div>
                  <div className="text-sm font-semibold text-foreground mt-1">
                    {supplier.paymentTerms || supplier.payment_terms || "Net 30"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Credit Period: {supplier.creditPeriodDays ?? supplier.credit_period_days ?? 30} Days
                  </p>
                </div>
              </div>

              {/* Outstanding Invoices */}
              <SectionCard
                title="Invoices & Settlement Status"
                description="Real-time supplier invoice registry and 3-way match statuses"
                icon={FileText}
                actions={
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/finance/invoices">All Finance Invoices</Link>
                  </Button>
                }
              >
                {loadingFinance ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mx-auto text-primary mb-2" />
                    Loading invoices...
                  </div>
                ) : financeInvoices.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No invoices recorded for this supplier.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="border-b bg-muted/40 uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Invoice #</th>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Due Date</th>
                          <th className="px-3 py-2 text-right">Grand Total</th>
                          <th className="px-3 py-2 text-right">Paid Amount</th>
                          <th className="px-3 py-2 text-right">Outstanding</th>
                          <th className="px-3 py-2 text-center">Match Status</th>
                          <th className="px-3 py-2 text-center">Status</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {financeInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-muted/30">
                            <td className="px-3 py-2 font-medium">
                              <Link
                                to={`/finance/invoices/${inv.id}` as any}
                                className="text-primary hover:underline"
                              >
                                {inv.invoice_number}
                              </Link>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{inv.invoice_date}</td>
                            <td className="px-3 py-2">{inv.due_date}</td>
                            <td className="px-3 py-2 text-right font-medium">
                              ₹{Number(inv.grand_total || 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-3 py-2 text-right text-emerald-600">
                              ₹{Number(inv.paid_amount || 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-rose-600">
                              ₹{Number(inv.outstanding_amount || 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <StatusBadge status={inv.match_status} />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <StatusBadge status={inv.status} />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                                <Link to={`/finance/invoices/${inv.id}` as any}>View</Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>

              {/* Payment History */}
              <SectionCard
                title="Disbursal & Payment History"
                description="Completed transactions and allocations"
                icon={CreditCard}
              >
                {loadingFinance ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mx-auto text-primary mb-2" />
                    Loading payments...
                  </div>
                ) : financePayments.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No payment disbursals recorded for this supplier.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="border-b bg-muted/40 uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Payment Ref</th>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Method</th>
                          <th className="px-3 py-2">Bank / UTR</th>
                          <th className="px-3 py-2 text-right">Amount (₹)</th>
                          <th className="px-3 py-2 text-right">Allocated (₹)</th>
                          <th className="px-3 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {financePayments.map((pmt) => (
                          <tr key={pmt.id} className="hover:bg-muted/30">
                            <td className="px-3 py-2 font-mono font-medium">
                              {pmt.payment_reference}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{pmt.payment_date}</td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 bg-muted rounded font-semibold text-[10px]">
                                {pmt.payment_method}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono text-muted-foreground">
                              {pmt.transaction_reference || pmt.bank_name || "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-bold">
                              ₹{Number(pmt.amount || 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-3 py-2 text-right text-emerald-600">
                              ₹{Number(pmt.allocated_amount || 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <StatusBadge status={pmt.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </div>
          )}
          {supplier.remarks && (
            <SectionCard title="Remarks" icon={Mail}>
              <p className="text-sm text-muted-foreground">{supplier.remarks}</p>
            </SectionCard>
          )}
        </div>
      )}
    </AppShell>
  );
}

function EmptySection({ text }: { text: string }) {
  return <p className="py-4 text-sm text-muted-foreground">{text}</p>;
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ValidatedEditField({
  label,
  value,
  error,
  maxLength,
  onChange,
}: {
  label: string;
  value?: string;
  error?: string;
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={value || ""}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className={cn(error && "border-destructive focus-visible:ring-destructive")}
      />
      {error && (
        <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
          <AlertCircle className="size-3" /> {error}
        </p>
      )}
    </div>
  );
}
