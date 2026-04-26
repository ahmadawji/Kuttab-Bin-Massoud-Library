import React, { useState, useRef } from "react";
import { Camera, X, Loader2, Save } from "lucide-react";
import { motion } from "motion/react";
import { Book } from "../types";

interface BookFormModalProps {
  book: Book | null;
  onClose: () => void;
  onSave: (b: Partial<Book>) => void;
}

export function BookFormModal({ book, onClose, onSave }: BookFormModalProps) {
  const [formData, setFormData] = useState<Partial<Book>>(
    book || {
      name: "",
      author: "",
      publisher: "",
      investigator: "",
      classification: "",
      volumes: "1",
      edition: "",
      code: "",
      notes: "",
      coverType: "",
      dateInserted: "",
    },
  );
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    const formDataPayload = new FormData();
    formDataPayload.append("cover", file);

    try {
      const res = await fetch("/api/books/extract", {
        method: "POST",
        body: formDataPayload,
      });

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }

      const data = await res.json();

      setFormData((prev) => ({
        ...prev,
        name: data.name || data.bookName || prev.name,
        author: data.author || prev.author,
        publisher: data.publisher || prev.publisher,
        investigator: data.investigator || prev.investigator,
        classification: data.classification || prev.classification,
        volumes: data.volumes ? String(data.volumes) : prev.volumes,
        edition: data.edition || prev.edition,
        code: data.code || prev.code,
        notes: data.notes || prev.notes,
      }));
    } catch (err: any) {
      console.error("Image extraction error:", err);
      alert(`لم نتمكن من استخراج البيانات من الصورة بنجاح: ${err.message}`);
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl bg-[var(--brand-surface)] border border-amber-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-amber-100 flex items-center justify-between bg-amber-50/50">
          <h2 className="text-xl font-bold text-[var(--brand-ink)]">
            {book ? "تعديل بيانات الكتاب" : "إضافة كتاب جديد"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-amber-500 hover:text-[var(--brand-primary-strong)] bg-white rounded-full shadow-sm border border-amber-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="mb-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="w-full border-2 border-dashed border-amber-300 bg-amber-50/60 text-[var(--brand-primary-strong)] hover:bg-amber-100/70 rounded-2xl py-6 flex flex-col items-center justify-center gap-3 transition"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="font-medium">
                    جاري تحليل الغلاف بالذكاء الاصطناعي...
                  </span>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-amber-100 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-[var(--brand-primary)]" />
                  </div>
                  <span className="font-medium">
                    التقط أو ارفع صورة الغلاف لملء البيانات تلقائياً
                  </span>
                </>
              )}
            </button>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>

          <form
            id="book-form"
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--brand-ink)]">
                اسم الكتاب *
              </label>
              <input
                required
                name="name"
                value={formData.name || ""}
                onChange={handleChange}
                className="w-full bg-amber-50/40 border border-amber-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--brand-ink)]">
                المؤلف *
              </label>
              <input
                required
                name="author"
                value={formData.author || ""}
                onChange={handleChange}
                className="w-full bg-amber-50/40 border border-amber-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--brand-ink)]">
                دار النشر
              </label>
              <input
                name="publisher"
                value={formData.publisher || ""}
                onChange={handleChange}
                className="w-full bg-amber-50/40 border border-amber-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--brand-ink)]">
                المحقق
              </label>
              <input
                name="investigator"
                value={formData.investigator || ""}
                onChange={handleChange}
                className="w-full bg-amber-50/40 border border-amber-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--brand-ink)]">
                التصنيف
              </label>
              <input
                name="classification"
                value={formData.classification || ""}
                onChange={handleChange}
                className="w-full bg-amber-50/40 border border-amber-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--brand-ink)]">
                عدد المجلدات
              </label>
              <input
                type="number"
                name="volumes"
                value={formData.volumes || ""}
                onChange={handleChange}
                className="w-full bg-amber-50/40 border border-amber-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--brand-ink)]">
                الطبعة/التاريخ{" "}
              </label>
              <input
                name="edition"
                value={formData.edition || ""}
                onChange={handleChange}
                className="w-full bg-amber-50/40 border border-amber-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--brand-ink)]">
                الرمز{" "}
              </label>
              <input
                name="code"
                value={formData.code || ""}
                onChange={handleChange}
                className="w-full bg-amber-50/40 border border-amber-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
            <div className="md:col-span-2 space-y-1 mt-2">
              <label className="text-sm font-medium text-[var(--brand-ink)]">
                ملاحظات
              </label>
              <textarea
                name="notes"
                rows={2}
                value={formData.notes || ""}
                onChange={handleChange}
                className="w-full bg-amber-50/40 border border-amber-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-amber-100 bg-amber-50/60 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-medium text-[var(--brand-muted)] hover:bg-amber-100 transition"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="book-form"
            className="px-5 py-2.5 rounded-xl font-medium bg-gradient-to-l from-[var(--brand-primary)] to-[var(--brand-primary-strong)] text-white hover:brightness-105 transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>حفظ البيانات</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
