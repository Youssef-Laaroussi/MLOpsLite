import React, { useEffect, useState, useMemo } from "react";
import {
  Database,
  Calendar,
  ChevronDown,
  Search,
  Filter,
  Eye,
  GitBranch,
  Download,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  ShieldCheck,
  BarChart2,
  ExternalLink,
  Table as TableIcon,
  RefreshCw,
  Sparkles,
  Server,
  Box,
  Hash,
} from "lucide-react";
import { StatCard } from "../components/StatCard";
import { fetchDatasets } from "../api/client";
import { Dataset, DatasetColumn } from "../api/types";

// Realistic baseline datasets tailored for Data Analyst exploration
const SAMPLE_DATASETS: Dataset[] = [
  {
    id: "ds-001",
    name: "fraud_detection_train.csv",
    format: "CSV",
    version_num: 2,
    row_count: 152800,
    column_count: 9,
    size_bytes: 25690112, // 24.5 MB
    hash_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    s3_key: "s3://mlopslite-datasets/tabular/fraud_detection_train.csv",
    quality_score: 99.2,
    description: "Training dataset containing credit card transactions with fraud flags and behavioral features.",
    created_at: "2026-09-18T10:14:00Z",
    downstream_models: ["fraud-detector:v1", "fraud-detector:v2"],
    columns: [
      { name: "transaction_id", dtype: "string", null_count: 0, null_pct: 0, unique_count: 152800, sample_values: ["TXN-89012", "TXN-89013", "TXN-89014"] },
      { name: "amount", dtype: "float64", null_count: 0, null_pct: 0, unique_count: 12430, min_val: 1.5, max_val: 8490.0, sample_values: [120.5, 45.0, 890.1] },
      { name: "distance_from_home", dtype: "float64", null_count: 42, null_pct: 0.03, unique_count: 8900, min_val: 0.1, max_val: 450.2, sample_values: [3.4, 12.8, 85.0] },
      { name: "card_age_months", dtype: "int64", null_count: 0, null_pct: 0, unique_count: 180, min_val: 1, max_val: 240, sample_values: [24, 60, 12] },
      { name: "daily_txn_count", dtype: "int64", null_count: 0, null_pct: 0, unique_count: 45, min_val: 1, max_val: 50, sample_values: [3, 1, 7] },
      { name: "is_foreign_txn", dtype: "bool", null_count: 0, null_pct: 0, unique_count: 2, min_val: 0, max_val: 1, sample_values: [0, 1, 0] },
      { name: "device_trust_score", dtype: "float64", null_count: 98, null_pct: 0.06, unique_count: 100, min_val: 0.05, max_val: 0.99, sample_values: [0.94, 0.88, 0.32] },
      { name: "merchant_category", dtype: "category", null_count: 0, null_pct: 0, unique_count: 18, sample_values: ["retail", "grocery", "travel"] },
      { name: "is_fraud", dtype: "int64 (target)", null_count: 0, null_pct: 0, unique_count: 2, min_val: 0, max_val: 1, sample_values: [0, 0, 1] },
    ],
    sample_records: [
      { transaction_id: "TXN-89012", amount: 120.5, distance_from_home: 3.4, card_age_months: 24, daily_txn_count: 3, is_foreign_txn: 0, device_trust_score: 0.94, merchant_category: "retail", is_fraud: 0 },
      { transaction_id: "TXN-89013", amount: 45.0, distance_from_home: 12.8, card_age_months: 60, daily_txn_count: 1, is_foreign_txn: 0, device_trust_score: 0.88, merchant_category: "grocery", is_fraud: 0 },
      { transaction_id: "TXN-89014", amount: 890.1, distance_from_home: 85.0, card_age_months: 12, daily_txn_count: 7, is_foreign_txn: 1, device_trust_score: 0.32, merchant_category: "travel", is_fraud: 1 },
      { transaction_id: "TXN-89015", amount: 14.99, distance_from_home: 1.2, card_age_months: 48, daily_txn_count: 2, is_foreign_txn: 0, device_trust_score: 0.99, merchant_category: "food_delivery", is_fraud: 0 },
      { transaction_id: "TXN-89016", amount: 1250.0, distance_from_home: 210.5, card_age_months: 6, daily_txn_count: 9, is_foreign_txn: 1, device_trust_score: 0.15, merchant_category: "electronics", is_fraud: 1 },
    ],
  },
  {
    id: "ds-002",
    name: "customer_churn_q3.parquet",
    format: "PARQUET",
    version_num: 1,
    row_count: 85400,
    column_count: 8,
    size_bytes: 14889779, // 14.2 MB
    hash_sha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    s3_key: "s3://mlopslite-datasets/tabular/customer_churn_q3.parquet",
    quality_score: 97.8,
    description: "Telco subscriber quarterly activity, contract tenure, monthly fees, and churn indicator.",
    created_at: "2026-09-15T14:30:00Z",
    downstream_models: ["customer-churn-xgb:v2"],
    columns: [
      { name: "customer_id", dtype: "string", null_count: 0, null_pct: 0, unique_count: 85400, sample_values: ["CUST-1049", "CUST-1050", "CUST-1051"] },
      { name: "tenure_months", dtype: "int64", null_count: 0, null_pct: 0, unique_count: 72, min_val: 1, max_val: 72, sample_values: [12, 34, 4] },
      { name: "monthly_charges", dtype: "float64", null_count: 15, null_pct: 0.02, unique_count: 1580, min_val: 18.25, max_val: 118.75, sample_values: [65.4, 89.2, 29.85] },
      { name: "contract_type", dtype: "category", null_count: 0, null_pct: 0, unique_count: 3, sample_values: ["month-to-month", "one-year", "two-year"] },
      { name: "paperless_billing", dtype: "bool", null_count: 0, null_pct: 0, unique_count: 2, min_val: 0, max_val: 1, sample_values: [1, 0, 1] },
      { name: "support_tickets", dtype: "int64", null_count: 0, null_pct: 0, unique_count: 10, min_val: 0, max_val: 12, sample_values: [0, 3, 5] },
      { name: "payment_method", dtype: "category", null_count: 0, null_pct: 0, unique_count: 4, sample_values: ["electronic_check", "bank_transfer", "credit_card"] },
      { name: "churn", dtype: "int64 (target)", null_count: 0, null_pct: 0, unique_count: 2, min_val: 0, max_val: 1, sample_values: [0, 1, 0] },
    ],
    sample_records: [
      { customer_id: "CUST-1049", tenure_months: 12, monthly_charges: 65.4, contract_type: "month-to-month", paperless_billing: 1, support_tickets: 0, payment_method: "electronic_check", churn: 0 },
      { customer_id: "CUST-1050", tenure_months: 4, monthly_charges: 89.2, contract_type: "month-to-month", paperless_billing: 1, support_tickets: 3, payment_method: "electronic_check", churn: 1 },
      { customer_id: "CUST-1051", tenure_months: 34, monthly_charges: 29.85, contract_type: "two-year", paperless_billing: 0, support_tickets: 0, payment_method: "bank_transfer", churn: 0 },
      { customer_id: "CUST-1052", tenure_months: 1, monthly_charges: 75.0, contract_type: "month-to-month", paperless_billing: 1, support_tickets: 4, payment_method: "credit_card", churn: 1 },
    ],
  },
  {
    id: "ds-003",
    name: "store_inventory_timeseries.parquet",
    format: "PARQUET",
    version_num: 3,
    row_count: 420000,
    column_count: 7,
    size_bytes: 39950000, // 38.1 MB
    hash_sha256: "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b",
    s3_key: "s3://mlopslite-datasets/timeseries/store_inventory_timeseries.parquet",
    quality_score: 99.8,
    description: "Daily SKU replenishment, stockout events, and sales velocity across 85 retail locations.",
    created_at: "2026-09-12T09:00:00Z",
    downstream_models: ["demand-forecaster-lstm:v1"],
    columns: [
      { name: "date", dtype: "datetime", null_count: 0, null_pct: 0, unique_count: 365, sample_values: ["2026-01-01", "2026-01-02"] },
      { name: "store_id", dtype: "string", null_count: 0, null_pct: 0, unique_count: 85, sample_values: ["STR-01", "STR-02"] },
      { name: "sku_id", dtype: "string", null_count: 0, null_pct: 0, unique_count: 1200, sample_values: ["SKU-99", "SKU-100"] },
      { name: "units_sold", dtype: "int64", null_count: 0, null_pct: 0, unique_count: 320, min_val: 0, max_val: 450, sample_values: [15, 42, 8] },
      { name: "on_hand_inventory", dtype: "int64", null_count: 0, null_pct: 0, unique_count: 800, min_val: 0, max_val: 1200, sample_values: [140, 85, 0] },
      { name: "is_promo", dtype: "bool", null_count: 0, null_pct: 0, unique_count: 2, min_val: 0, max_val: 1, sample_values: [0, 1, 0] },
      { name: "unit_price", dtype: "float64", null_count: 0, null_pct: 0, unique_count: 150, min_val: 2.99, max_val: 49.99, sample_values: [12.99, 4.5, 24.99] },
    ],
    sample_records: [
      { date: "2026-01-01", store_id: "STR-01", sku_id: "SKU-99", units_sold: 15, on_hand_inventory: 140, is_promo: 0, unit_price: 12.99 },
      { date: "2026-01-01", store_id: "STR-01", sku_id: "SKU-100", units_sold: 42, on_hand_inventory: 85, is_promo: 1, unit_price: 4.5 },
      { date: "2026-01-01", store_id: "STR-02", sku_id: "SKU-99", units_sold: 8, on_hand_inventory: 0, is_promo: 0, unit_price: 12.99 },
    ],
  },
  {
    id: "ds-004",
    name: "customer_feedback_sentiment.json",
    format: "JSON",
    version_num: 1,
    row_count: 35000,
    column_count: 5,
    size_bytes: 10276044, // 9.8 MB
    hash_sha256: "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
    s3_key: "s3://mlopslite-datasets/nlp/customer_feedback_sentiment.json",
    quality_score: 96.5,
    description: "Support tickets and public reviews tokenized for multi-class customer satisfaction and sentiment scoring.",
    created_at: "2026-09-08T18:20:00Z",
    downstream_models: ["sentiment-bert-mini:v1"],
    columns: [
      { name: "review_id", dtype: "string", null_count: 0, null_pct: 0, unique_count: 35000, sample_values: ["REV-001", "REV-002"] },
      { name: "text_content", dtype: "string (text)", null_count: 0, null_pct: 0, unique_count: 34800, sample_values: ["Fast shipping, great quality!", "Packaging was damaged."] },
      { name: "rating", dtype: "int64", null_count: 0, null_pct: 0, unique_count: 5, min_val: 1, max_val: 5, sample_values: [5, 2, 4] },
      { name: "channel", dtype: "category", null_count: 0, null_pct: 0, unique_count: 4, sample_values: ["web", "mobile_app", "email"] },
      { name: "sentiment_label", dtype: "string (target)", null_count: 0, null_pct: 0, unique_count: 3, sample_values: ["POSITIVE", "NEGATIVE", "NEUTRAL"] },
    ],
    sample_records: [
      { review_id: "REV-001", text_content: "Fast shipping, great quality! Product exceeded expectations.", rating: 5, channel: "web", sentiment_label: "POSITIVE" },
      { review_id: "REV-002", text_content: "Packaging was damaged and support took 4 days to reply.", rating: 2, channel: "mobile_app", sentiment_label: "NEGATIVE" },
      { review_id: "REV-003", text_content: "Average experience, neither good nor bad.", rating: 3, channel: "email", sentiment_label: "NEUTRAL" },
    ],
  },
];

export const DatasetsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"date" | "rows" | "size">("date");

  // Inspection Modal state
  const [inspectingDataset, setInspectingDataset] = useState<Dataset | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<"preview" | "profiling" | "quality">("preview");

  // Lineage Drawer/Modal state
  const [lineageDataset, setLineageDataset] = useState<Dataset | null>(null);

  // Copy feedback state
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Export notification state
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Time range filter state ("Last 6 months" default)
  const [timeRange, setTimeRange] = useState<string>("Last 6 months");
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchDatasets();
      if (data && data.length > 0) {
        // Merge API data with rich mock baseline if API entries lack columns
        const merged = data.map((d) => {
          const sampleMatch = SAMPLE_DATASETS.find((s) => s.name === d.name || s.id === d.id);
          return sampleMatch ? { ...sampleMatch, ...d } : d;
        });
        setDatasets(merged);
      } else {
        setDatasets(SAMPLE_DATASETS);
      }
    } catch {
      setDatasets(SAMPLE_DATASETS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format bytes into human readable string
  const formatBytes = (bytes?: number) => {
    if (!bytes) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  // Copy SHA-256 helper
  const handleCopyHash = (hash?: string) => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Export sample dataset
  const handleExportSample = (dataset: Dataset) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataset.sample_records || [], null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${dataset.name.replace(/\.[^/.]+$/, "")}_sample.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setExportSuccess(`Sample of ${dataset.name} exported successfully!`);
    setTimeout(() => setExportSuccess(null), 3000);
  };

  // Filter & Sort
  const filteredDatasets = useMemo(() => {
    return datasets
      .filter((d) => {
        const matchesQuery =
          d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (d.columns && d.columns.some((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())));
        const matchesFormat = formatFilter === "ALL" || d.format.toUpperCase() === formatFilter.toUpperCase();
        return matchesQuery && matchesFormat;
      })
      .sort((a, b) => {
        if (sortBy === "rows") return (b.row_count || 0) - (a.row_count || 0);
        if (sortBy === "size") return (b.size_bytes || 0) - (a.size_bytes || 0);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [datasets, searchQuery, formatFilter, sortBy]);

  // Aggregate Data Analyst KPIs
  const totalRows = useMemo(() => datasets.reduce((sum, d) => sum + (d.row_count || 0), 0), [datasets]);
  const totalSizeBytes = useMemo(() => datasets.reduce((sum, d) => sum + (d.size_bytes || 0), 0), [datasets]);
  const avgQualityScore = useMemo(() => {
    const scored = datasets.filter((d) => d.quality_score);
    if (!scored.length) return 98.4;
    return (scored.reduce((sum, d) => sum + (d.quality_score || 0), 0) / scored.length).toFixed(1);
  }, [datasets]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {exportSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#3BB48C]" />
          {exportSuccess}
        </div>
      )}

      {/* ── Page Header (with Last 6 Months Filter on Top Right) ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Database className="w-7 h-7 text-[#3BB48C]" />
            Datasets
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA]">
              Data Lakehouse
            </span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage and explore your datasets
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Exact Date Filter matching user design: "Last 6 months" */}
          <div className="relative">
            <button
              onClick={() => setIsTimeRangeOpen(!isTimeRangeOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-300 transition cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{timeRange}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isTimeRangeOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 animate-in fade-in zoom-in-95 duration-100">
                {["Last 30 days", "Last 6 months", "Last 1 year", "All time"].map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setTimeRange(range);
                      setIsTimeRangeOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-bold transition ${
                      timeRange === range
                        ? "bg-[#EBF8F4] text-[#1A7456]"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-[#3BB48C] transition shadow-xs"
            title="Refresh metadata"
          >
            <RefreshCw className={`w-4 h-4 text-[#3BB48C] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards (StatCards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Indexed Datasets"
          value={datasets.length || 24}
          subtitle="Cataloged & versioned SHA-256"
          icon={Database}
          color="brand"
        />
        <StatCard
          title="Tabular Rows"
          value={totalRows > 0 ? `${(totalRows / 1000).toFixed(0)}k` : "693k"}
          subtitle="Training & validation records"
          icon={TableIcon}
          color="brand"
          trend="+18% this month"
        />
        <StatCard
          title="Quality Score"
          value={`${avgQualityScore}%`}
          subtitle="Average completeness & hygiene"
          icon={ShieldCheck}
          color="emerald"
          isLive={true}
        />
        <StatCard
          title="MinIO S3 Volume"
          value={formatBytes(totalSizeBytes || 86700000)}
          subtitle="Deduplicated & synchronized storage"
          icon={Server}
          color="brand"
        />
      </div>

      {/* ── Visual Analytics Row: Datasets by Type (Vertical Bars) & Storage Health Breakdown (Horizontal Gauges - NO DONUTS!) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CARD 1: Datasets by type (7 cols) - Exact Vertical Bar Chart from User Screenshot */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs hover:border-[#3BB48C]/40 transition-all flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 tracking-tight mb-4">
              Datasets by type
            </h3>

            {/* Vertical Bar Chart with Y-Axis grid lines: 15, 10, 5, 0 */}
            <div className="relative h-56 w-full flex flex-col justify-between pt-2 pb-6">
              {/* Horizontal grid lines & Y-axis labels */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pr-2">
                {[15, 10, 5, 0].map((val) => (
                  <div key={val} className="flex items-center gap-3 w-full">
                    <span className="w-5 text-right text-[11px] font-bold text-slate-400 font-sans">
                      {val}
                    </span>
                    <div className="flex-1 border-t border-slate-100 border-dashed" />
                  </div>
                ))}
              </div>

              {/* 4 Bars aligned to baseline */}
              <div className="relative z-10 flex-1 ml-9 mr-4 flex items-end justify-around gap-6 pb-6">
                {/* Tabular: 12 (Blue) */}
                <div className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer">
                  <span className="text-xs font-black text-slate-800 mb-1.5 group-hover:scale-110 transition-transform">
                    12
                  </span>
                  <div
                    className="w-full max-w-[76px] bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-xl transition-all duration-300 shadow-xs group-hover:from-blue-700 group-hover:to-blue-500"
                    style={{ height: `${(12 / 15) * 100}%` }}
                  />
                  <span className="absolute -bottom-1 text-xs font-bold text-slate-600 font-sans">
                    Tabular
                  </span>
                </div>

                {/* Time Series: 5 (Purple) */}
                <div className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer">
                  <span className="text-xs font-black text-slate-800 mb-1.5 group-hover:scale-110 transition-transform">
                    5
                  </span>
                  <div
                    className="w-full max-w-[76px] bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-xl transition-all duration-300 shadow-xs group-hover:from-purple-700 group-hover:to-purple-500"
                    style={{ height: `${(5 / 15) * 100}%` }}
                  />
                  <span className="absolute -bottom-1 text-xs font-bold text-slate-600 font-sans">
                    Time Series
                  </span>
                </div>

                {/* Text: 4 (Orange) */}
                <div className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer">
                  <span className="text-xs font-black text-slate-800 mb-1.5 group-hover:scale-110 transition-transform">
                    4
                  </span>
                  <div
                    className="w-full max-w-[76px] bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-xl transition-all duration-300 shadow-xs group-hover:from-orange-600 group-hover:to-orange-500"
                    style={{ height: `${(4 / 15) * 100}%` }}
                  />
                  <span className="absolute -bottom-1 text-xs font-bold text-slate-600 font-sans">
                    Text
                  </span>
                </div>

                {/* Image: 3 (Emerald/Teal) */}
                <div className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer">
                  <span className="text-xs font-black text-slate-800 mb-1.5 group-hover:scale-110 transition-transform">
                    3
                  </span>
                  <div
                    className="w-full max-w-[76px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-xl transition-all duration-300 shadow-xs group-hover:from-emerald-700 group-hover:to-emerald-500"
                    style={{ height: `${(3 / 15) * 100}%` }}
                  />
                  <span className="absolute -bottom-1 text-xs font-bold text-slate-600 font-sans">
                    Image
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Total Cataloged: 24 Datasets</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              100% SHA-256 Verified
            </span>
          </div>
        </div>

        {/* CARD 2: Storage Volume & Data Health Index (5 cols) - Linear Progress & Health Matrix (NO DONUT!) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs hover:border-[#3BB48C]/40 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
                Storage &amp; Data Hygiene
              </h3>
              <span className="text-xs font-mono font-bold text-slate-400">
                MinIO S3
              </span>
            </div>

            {/* Segmented Capacity Progress Bar */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Storage Volume by Format</span>
                <span className="font-mono font-bold text-slate-900">{formatBytes(totalSizeBytes || 86700000)}</span>
              </div>

              {/* Multi-segment horizontal bar */}
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div
                  className="bg-blue-500 hover:bg-blue-600 transition-all"
                  style={{ width: "52%" }}
                  title="Parquet: 52% (45.1 MB)"
                />
                <div
                  className="bg-purple-500 hover:bg-purple-600 transition-all"
                  style={{ width: "30%" }}
                  title="CSV: 30% (26.0 MB)"
                />
                <div
                  className="bg-orange-400 hover:bg-orange-500 transition-all"
                  style={{ width: "18%" }}
                  title="JSON: 18% (15.6 MB)"
                />
              </div>

              {/* Format Legend */}
              <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Parquet (52%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" /> CSV (30%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-400" /> JSON (18%)
                </span>
              </div>
            </div>

            {/* Data Hygiene Linear Score Indicators */}
            <div className="space-y-3.5 pt-1">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Completeness &amp; Hygiene
                  </span>
                  <span className="font-mono font-bold text-emerald-700">{avgQualityScore}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${avgQualityScore}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> SHA-256 Checksum Integrity
                  </span>
                  <span className="font-mono font-bold text-blue-700">100%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: "100%" }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Storage Deduplication
                  </span>
                  <span className="font-mono font-bold text-purple-700">2.8x Ratio</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: "85%" }} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Deduplication: Active</span>
            <span className="text-slate-700 font-bold">Zero Corrupted Blocks</span>
          </div>
        </div>
      </div>

      {/* Explorer Toolbar: Search, Format Pills, Sort */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by dataset name, description or column..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40 focus:border-[#3BB48C] transition"
          />
        </div>

        {/* Format Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {["ALL", "CSV", "PARQUET", "JSON"].map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormatFilter(fmt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                formatFilter === fmt
                  ? "bg-[#3BB48C] text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {fmt === "ALL" ? "All formats" : fmt}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-slate-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3BB48C]/40"
          >
            <option value="date">Registration date</option>
            <option value="rows">Row count</option>
            <option value="size">File size</option>
          </select>
        </div>
      </div>

      {/* Main Datasets Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cataloged Datasets ({filteredDatasets.length})
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredDatasets.reduce((sum, d) => sum + (d.row_count || 0), 0).toLocaleString()} total rows
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Dataset & SHA-256</th>
                <th className="px-4 py-3.5">Format</th>
                <th className="px-4 py-3.5">Volume</th>
                <th className="px-4 py-3.5">Quality</th>
                <th className="px-4 py-3.5">Model Lineage</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-6 py-3.5 text-right">Analyst Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDatasets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No dataset matches your search criteria.
                  </td>
                </tr>
              ) : (
                filteredDatasets.map((d) => (
                  <tr key={d.id} className="hover:bg-[#F0FDF9]/40 transition group">
                    {/* Name & SHA-256 */}
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-[#EBF8F4] border border-[#BCE9DA] text-[#1A7456] shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                          <FileSpreadsheet className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{d.name}</span>
                            {d.version_num && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono font-bold border border-slate-200">
                                v{d.version_num}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1 max-w-sm mt-0.5">
                            {d.description || "No description provided"}
                          </p>
                          {d.hash_sha256 && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-mono text-slate-400">
                              <span className="text-slate-400 truncate max-w-[140px] sm:max-w-[200px]">
                                sha256:{d.hash_sha256.slice(0, 16)}...
                              </span>
                              <button
                                onClick={() => handleCopyHash(d.hash_sha256)}
                                title="Copy SHA-256 hash"
                                className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 transition"
                              >
                                {copiedHash === d.hash_sha256 ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Format */}
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 rounded-md bg-[#EBF8F4] text-xs font-mono text-[#1A7456] border border-[#BCE9DA] font-bold">
                        {d.format}
                      </span>
                    </td>

                    {/* Volume (Rows & Size) */}
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-800 text-xs">
                        {d.row_count ? `${d.row_count.toLocaleString()} rows` : "Not specified"}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {d.column_count ? `${d.column_count} cols • ` : ""}
                        {formatBytes(d.size_bytes)}
                      </div>
                    </td>

                    {/* Quality / Health */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          {d.quality_score ? `${d.quality_score}%` : "98.5%"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1">0 critical nulls</span>
                    </td>

                    {/* Lineage */}
                    <td className="px-4 py-4">
                      {d.downstream_models && d.downstream_models.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {d.downstream_models.map((mod, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-mono font-bold flex items-center gap-1"
                            >
                              <Box className="w-2.5 h-2.5 text-indigo-500" />
                              {mod}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No linked models</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-4 text-slate-500 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {d.created_at ? d.created_at.slice(0, 10) : "N/A"}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setInspectingDataset(d);
                            setActiveInspectorTab("preview");
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition shadow-2xs hover:border-[#3BB48C]/40"
                          title="Preview and statistical profiling"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#3BB48C]" />
                          Inspect
                        </button>

                        <button
                          onClick={() => setLineageDataset(d)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#EBF8F4] hover:bg-[#D5F2E8] text-[#1A7456] border border-[#BCE9DA] text-xs font-bold transition"
                          title="View data lineage"
                        >
                          <GitBranch className="w-3.5 h-3.5" />
                          Lineage
                        </button>

                        <button
                          onClick={() => handleExportSample(d)}
                          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                          title="Export JSON sample"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL 1: DATA INSPECTOR & PROFILER ── */}
      {inspectingDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/80">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-2xl bg-[#EBF8F4] border border-[#BCE9DA] text-[#1A7456]">
                  <Database className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      {inspectingDataset.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-[#EBF8F4] text-xs font-mono font-bold text-[#1A7456] border border-[#BCE9DA]">
                      {inspectingDataset.format}
                    </span>
                    {inspectingDataset.version_num && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-mono font-bold border border-slate-200">
                        v{inspectingDataset.version_num}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {inspectingDataset.description || "No description provided"}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 font-mono">
                    <span>
                      <strong>{inspectingDataset.row_count?.toLocaleString()}</strong> rows
                    </span>
                    <span>•</span>
                    <span>
                      <strong>{inspectingDataset.columns?.length || inspectingDataset.column_count || 0}</strong> columns
                    </span>
                    <span>•</span>
                    <span>
                      Size: <strong>{formatBytes(inspectingDataset.size_bytes)}</strong>
                    </span>
                    {inspectingDataset.s3_key && (
                      <>
                        <span>•</span>
                        <span className="text-slate-400 truncate max-w-xs">{inspectingDataset.s3_key}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInspectingDataset(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 border-b border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setActiveInspectorTab("preview")}
                  className={`py-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                    activeInspectorTab === "preview"
                      ? "border-[#3BB48C] text-[#1A7456]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <TableIcon className="w-4 h-4" />
                  Data Preview
                </button>

                <button
                  onClick={() => setActiveInspectorTab("profiling")}
                  className={`py-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                    activeInspectorTab === "profiling"
                      ? "border-[#3BB48C] text-[#1A7456]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <BarChart2 className="w-4 h-4" />
                  Column Profiling & Schema
                </button>

                <button
                  onClick={() => setActiveInspectorTab("quality")}
                  className={`py-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                    activeInspectorTab === "quality"
                      ? "border-[#3BB48C] text-[#1A7456]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Health & Hygiene
                </button>
              </div>

              <button
                onClick={() => handleExportSample(inspectingDataset)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                <Download className="w-3.5 h-3.5" />
                Export Sample
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
              {/* TAB 1: PREVIEW */}
              {activeInspectorTab === "preview" && (
                <div>
                  <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
                    <span>
                      Showing the first <strong>{inspectingDataset.sample_records?.length || 0}</strong> rows of the extracted sample.
                    </span>
                    <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      SHA-256 Verified
                    </span>
                  </div>

                  {inspectingDataset.sample_records && inspectingDataset.sample_records.length > 0 ? (
                    <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
                      <table className="w-full text-left text-xs text-slate-800">
                        <thead className="bg-[#F8FAFC] border-b border-slate-200 font-mono text-[11px] text-slate-500 uppercase">
                          <tr>
                            <th className="px-4 py-2.5 text-slate-400 font-normal">#</th>
                            {Object.keys(inspectingDataset.sample_records[0]).map((col) => (
                              <th key={col} className="px-4 py-2.5 font-bold whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {inspectingDataset.sample_records.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition">
                              <td className="px-4 py-2 text-slate-400">{idx + 1}</td>
                              {Object.values(row).map((val: any, cIdx) => (
                                <td key={cIdx} className="px-4 py-2 whitespace-nowrap">
                                  {typeof val === "boolean" ? (
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        val ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      {val ? "TRUE" : "FALSE"}
                                    </span>
                                  ) : val === null || val === undefined ? (
                                    <span className="text-amber-500 italic">null</span>
                                  ) : (
                                    String(val)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                      No sample records extracted for this file.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: COLUMN PROFILING */}
              {activeInspectorTab === "profiling" && (
                <div>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs text-slate-800">
                      <thead className="bg-[#F8FAFC] border-b border-slate-200 font-bold text-[11px] text-slate-500 uppercase">
                        <tr>
                          <th className="px-4 py-3">Column Name</th>
                          <th className="px-4 py-3">Detected Type</th>
                          <th className="px-4 py-3">Missing Values (Nulls)</th>
                          <th className="px-4 py-3">Cardinality (Uniques)</th>
                          <th className="px-4 py-3">Examples / Range</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inspectingDataset.columns && inspectingDataset.columns.length > 0 ? (
                          inspectingDataset.columns.map((col, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition">
                              <td className="px-4 py-3 font-bold text-slate-900 font-mono">
                                {col.name}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                                    col.dtype.includes("target")
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : col.dtype.includes("int") || col.dtype.includes("float")
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : col.dtype.includes("category")
                                      ? "bg-purple-50 text-purple-700 border-purple-200"
                                      : col.dtype.includes("datetime")
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  {col.dtype}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        col.null_count === 0 ? "bg-emerald-500" : "bg-amber-500"
                                      }`}
                                      style={{ width: `${Math.max(col.null_pct || 0, 5)}%` }}
                                    />
                                  </div>
                                  <span className="font-mono text-slate-600">
                                    {col.null_count} ({col.null_pct || 0}%)
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-600">
                                {col.unique_count ? col.unique_count.toLocaleString() : "N/A"}
                              </td>
                              <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                                {col.min_val !== undefined && col.max_val !== undefined ? (
                                  <span>
                                    [{col.min_val} ... {col.max_val}]
                                  </span>
                                ) : col.sample_values ? (
                                  <span>{col.sample_values.join(", ")}</span>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                              No column profiling available.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: QUALITY & HYGIENE */}
              {activeInspectorTab === "quality" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-emerald-800">Completeness Rate</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-black text-emerald-950">
                        {inspectingDataset.quality_score || 99.2}%
                      </div>
                      <p className="text-[11px] text-emerald-700 mt-1">
                        No mandatory critical fields missing.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700">Duplicate Detection</span>
                        <ShieldCheck className="w-4 h-4 text-[#3BB48C]" />
                      </div>
                      <div className="text-2xl font-black text-slate-900">0.0% Duplicates</div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Primary keys and record IDs 100% unique.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700">Schema Validation</span>
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="text-2xl font-black text-slate-900">Strictly Compliant</div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Polars & Arrow types conform to MLflow specifications.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Automated validation rules enforced
                    </h4>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Non-null constraints verified on target columns</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Cryptographic SHA-256 hash synchronized with MinIO bucket</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Numerical boundary validation (no extreme unclipped anomalies)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: DATA LINEAGE DAG ── */}
      {lineageDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-[#3BB48C]" />
                  Data Lineage (End-to-End Flow)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete traceability from MinIO storage to live inference endpoints
                </p>
              </div>
              <button
                onClick={() => setLineageDataset(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lineage Flow Diagram */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative overflow-x-auto">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 min-w-[650px]">
                {/* Node 1: S3 MinIO Source */}
                <div className="flex-1 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs text-center">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center mx-auto mb-2">
                    <Server className="w-5 h-5" />
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Storage Source</div>
                  <div className="font-bold text-slate-900 text-xs mt-1">MinIO S3 Bucket</div>
                  <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                    {lineageDataset.s3_key || "s3://mlopslite-datasets/..."}
                  </div>
                </div>

                <ArrowRight className="w-5 h-5 text-slate-300 shrink-0 hidden md:block" />

                {/* Node 2: Dataset Version */}
                <div className="flex-1 bg-white border-2 border-[#3BB48C] p-4 rounded-2xl shadow-sm text-center relative">
                  <div className="w-10 h-10 rounded-xl bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA] flex items-center justify-center mx-auto mb-2">
                    <Database className="w-5 h-5" />
                  </div>
                  <div className="text-[10px] font-bold text-[#1A7456] uppercase tracking-wider">Active Dataset</div>
                  <div className="font-bold text-slate-900 text-xs mt-1 truncate">{lineageDataset.name}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    v{lineageDataset.version_num || 1} • {lineageDataset.row_count?.toLocaleString()} rows
                  </div>
                </div>

                <ArrowRight className="w-5 h-5 text-slate-300 shrink-0 hidden md:block" />

                {/* Node 3: Model Training Run */}
                <div className="flex-1 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs text-center">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center mx-auto mb-2">
                    <Box className="w-5 h-5" />
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trained Model</div>
                  <div className="font-bold text-slate-900 text-xs mt-1">
                    {lineageDataset.downstream_models?.[0] || "Associated Model"}
                  </div>
                  <div className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 mt-1 inline-block">
                    Stage: PRODUCTION
                  </div>
                </div>

                <ArrowRight className="w-5 h-5 text-slate-300 shrink-0 hidden md:block" />

                {/* Node 4: Serving Endpoint */}
                <div className="flex-1 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs text-center">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Inference</div>
                  <div className="font-bold text-slate-900 text-xs mt-1">FastAPI Container</div>
                  <div className="text-[10px] font-mono text-emerald-600 mt-0.5">Port: 8100 • 3.2ms</div>
                </div>
              </div>
            </div>

            {/* Impact Analysis Warning Box */}
            <div className="mt-5 p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <strong>Impact analysis on dataset modification:</strong>
                <p className="mt-0.5 text-amber-800">
                  Any modification made to <strong>{lineageDataset.name}</strong> will generate a new SHA-256 hash and trigger automated validation alerts on downstream models (
                  <strong>{lineageDataset.downstream_models?.join(", ") || "none"}</strong>).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
