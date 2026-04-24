import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  Edit2,
  LogIn,
  Loader2,
  Link as LinkIcon,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import { Book } from "../types";
import { BookFormModal } from "./BookFormModal";

interface LibraryManagerProps {
  user: any | null;
  onLogout: () => void;
  onLogin: () => void;
  isReadOnly: boolean;
}

export function LibraryManager({
  user,
  onLogout,
  onLogin,
  isReadOnly,
}: LibraryManagerProps) {
  const kottabLogo = new URL("../lib/images/Kottab Logo.jpg", import.meta.url)
    .href;

  const [sheetId, setSheetId] = useState(
    () => localStorage.getItem("library_sheet_id") || "",
  );
  const [isSheetSet, setIsSheetSet] = useState(!!sheetId);

  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fetchBooks = async () => {
    if (!sheetId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/books?sheetId=${sheetId}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "فشل في تحميل البيانات");
      }
      const data = await res.json();
      setBooks(data.filter((b: Book) => b.name || b.author || b.publisher));
    } catch (e: any) {
      if (
        isReadOnly &&
        (e.message?.includes("Guest access is not configured") ||
          e.message?.includes("Not authenticated"))
      ) {
        alert(
          "لا يمكن فتح البيانات كزائر حالياً.\n\nللسماح بالعرض بدون تسجيل دخول:\n1) اجعل الجدول متاحاً للعرض العام (Anyone with the link can view)، أو\n2) أضف GOOGLE_API_KEY في ملف البيئة ثم أعد تشغيل السيرفر.",
        );
      } else if (e.message?.includes("insufficient authentication scopes")) {
        if (isReadOnly) {
          alert(
            "لا يمكن عرض هذا الجدول كزائر حالياً.\nتأكد أن جدول Google Sheets متاح للقراءة العامة، أو قم بتسجيل الدخول للوصول الكامل.",
          );
        } else {
          alert(
            "حدث خطأ في الصلاحيات: \nلم تقم بالموافقة على وصول التطبيق للجداول (Google Sheets). الرجاء تسجيل الدخول مجدداً والتأكد من تحديد علامة (صح) بجانب صلاحية قراءة وتعديل جداول البيانات.",
          );
          onLogout();
        }
      } else if (e.message?.includes("not found")) {
        alert(
          "حدث خطأ: لم يتم العثور على جدول البيانات! \n\nتأكد من:\n1. أن المعرف (Sheet ID) صحيح تماماً ولا يحتوي على الحروف الإضافية في الرابط.\n2. أنك قمت بإنشاء الجدول باستخدام الحساب الذي دخلت به.",
        );
      } else {
        alert(
          `تعذر جلب البيانات: ${e.message}\nتأكد من أن المعرف صحيح ومن صلاحيات الوصول.`,
        );
      }
      setIsSheetSet(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSheetSet) {
      fetchBooks();
    }
  }, [isSheetSet]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSetSheet = (e: React.FormEvent) => {
    e.preventDefault();
    let id = sheetId.trim();
    if (id.includes("/d/")) {
      const match = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) id = match[1];
    }
    if (id) {
      setSheetId(id);
      localStorage.setItem("library_sheet_id", id);
      setIsSheetSet(true);
    }
  };

  const handleSaveBook = async (book: Partial<Book>) => {
    if (!sheetId) return;
    const isEditing = !!editingBook;
    const url = isEditing ? `/api/books/${editingBook.id}` : "/api/books";
    const method = isEditing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book, sheetId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "حدث خطأ غير معروف في الخادم");
      }
      setIsModalOpen(false);
      fetchBooks();
    } catch (e: any) {
      alert(`فشل في حفظ الكتاب: ${e.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الكتاب؟")) return;
    try {
      const res = await fetch(`/api/books/${id}`, {
        method: "DELETE",
        headers: { "x-sheet-id": sheetId },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "حدث خطأ غير معروف في الخادم");
      }
      fetchBooks();
    } catch (e: any) {
      alert(`فشل في مسح الكتاب: ${e.message}`);
    }
  };

  if (!isSheetSet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent p-6">
        <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
          {isReadOnly ? (
            <button
              onClick={onLogin}
              className="text-[var(--brand-muted)] hover:text-[var(--brand-primary-strong)] font-medium transition flex items-center gap-2 bg-[var(--brand-surface)] px-4 py-2 rounded-xl shadow-sm border border-amber-100"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول للإدارة</span>
            </button>
          ) : (
            <button
              onClick={onLogout}
              className="text-[var(--brand-muted)] hover:text-red-600 font-medium transition flex items-center gap-2 bg-[var(--brand-surface)] px-4 py-2 rounded-xl shadow-sm border border-amber-100"
            >
              <LogIn className="w-4 h-4 rotate-180" />
              <span>تسجيل الخروج</span>
            </button>
          )}
        </div>
        <form
          onSubmit={handleSetSheet}
          className="max-w-md w-full bg-[var(--brand-surface)] border border-amber-100 rounded-2xl shadow-xl p-8 space-y-6"
        >
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-[var(--brand-ink)]">
              معرف جدول البيانات
            </h2>
            <p className="text-[var(--brand-muted)] text-sm">
              أدخل معرف (ID) الخاص بجدول Google Sheets ليتم استخدامه كقاعدة
              بيانات.
            </p>
          </div>
          <div>
            <input
              type="text"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder="مثال: 1BxiMVs0XRYFgwnAKB... أو رابط الجدول كامل"
              className="w-full bg-amber-50/40 border border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] dir-ltr"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-l from-[var(--brand-primary)] to-[var(--brand-primary-strong)] text-white rounded-xl py-3 font-semibold hover:brightness-105 transition"
          >
            متابعة
          </button>
        </form>
      </div>
    );
  }

  const filteredBooks = books.filter(
    (b) =>
      b.name.includes(searchQuery) ||
      b.author.includes(searchQuery) ||
      b.classification.includes(searchQuery) ||
      b.publisher.includes(searchQuery) ||
      b.investigator.includes(searchQuery) ||
      b.notes.includes(searchQuery),
  );

  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBooks = filteredBooks.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <div className="min-h-screen bg-transparent">
      <header className="bg-[var(--brand-surface)]/95 backdrop-blur border-b border-amber-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[var(--brand-primary)] font-bold text-xl">
            <img
              src={kottabLogo}
              alt="شعار كُتّاب"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-amber-100"
            />
            <span>مكتبة كُتّاب عبد الله بن مسعود</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="hidden sm:flex items-center gap-2 text-sm text-[var(--brand-muted)]">
                <img
                  src={user.picture}
                  alt=""
                  className="w-8 h-8 rounded-full ring-2 ring-amber-100"
                />
                <span>{user.name}</span>
              </div>
            ) : (
              <span className="hidden sm:inline text-sm text-[var(--brand-muted)]">
                وضع الزائر (عرض فقط)
              </span>
            )}
            <button
              onClick={() => {
                setIsSheetSet(false);
              }}
              className="text-[var(--brand-muted)] hover:text-[var(--brand-primary-strong)] transition"
              title="تغيير جدول البيانات"
            >
              <LinkIcon className="w-5 h-5" />
            </button>
            {isReadOnly ? (
              <button
                onClick={onLogin}
                className="text-[var(--brand-muted)] hover:text-[var(--brand-primary-strong)] text-sm font-medium transition"
              >
                تسجيل الدخول
              </button>
            ) : (
              <button
                onClick={onLogout}
                className="text-[var(--brand-muted)] hover:text-red-600 text-sm font-medium transition"
              >
                خروج
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 max-[675px]:pb-28 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[var(--brand-surface)] p-4 rounded-2xl shadow-sm border border-amber-100">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
            <input
              type="text"
              placeholder="ابحث باسم الكتاب، المؤلف، أو التصنيف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-amber-50/40 border border-amber-100 rounded-xl pr-10 pl-4 py-2.5 focus:ring-2 focus:ring-[var(--brand-primary)] transition"
            />
          </div>
          {!isReadOnly && (
            <button
              onClick={() => {
                setEditingBook(null);
                setIsModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-l from-[var(--brand-primary)] to-[var(--brand-primary-strong)] text-white px-5 py-2.5 rounded-xl font-medium hover:brightness-105 transition max-[677px]:fixed max-[677px]:bottom-5 max-[677px]:right-5 max-[677px]:z-30 max-[677px]:w-auto max-[677px]:rounded-full max-[677px]:shadow-2xl"
            >
              <Plus className="w-5 h-5" />
              <span>إضافة كتاب</span>
            </button>
          )}
        </div>

        {isReadOnly && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-[var(--brand-muted)]">
            وضع العرض فقط: يمكنك تصفح البيانات بدون تسجيل الدخول، لكن لا يمكنك
            الإضافة أو التعديل أو الحذف.
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--brand-muted)]">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>جاري تحميل الكتب...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-20 text-[var(--brand-muted)] bg-[var(--brand-surface)] rounded-2xl border border-amber-100 shadow-sm">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg">لا توجد كتب هنا.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block bg-[var(--brand-surface)] rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-amber-50/60 border-b border-amber-100 text-[var(--brand-muted)]">
                  <tr>
                    <th className="px-9 py-4 font-semibold">اسم الكتاب</th>
                    <th className="px-9 py-4 font-semibold">المؤلف</th>
                    <th className="px-4 py-4 font-semibold">المحقق</th>
                    <th className="px-10 py-4 font-semibold">التصنيف</th>
                    <th className="px-2 py-4 font-semibold">المجلدات</th>
                    <th className="px-9 py-4 font-semibold">الطبعة</th>
                    <th className="px-9 py-4 font-semibold">الرمز</th>
                    {!isReadOnly && (
                      <th className="px-6 py-4 font-semibold text-center">
                        الإجراءات
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100/70 text-[var(--brand-muted)]">
                  {paginatedBooks.map((book) => (
                    <tr
                      key={book.id}
                      className="hover:bg-amber-50/40 transition"
                    >
                      <td className="px-6 py-4 font-medium text-[var(--brand-ink)]">
                        {book.name}
                      </td>
                      <td className="px-6 py-4">{book.author}</td>
                      <td className="px-4 py-4">{book.investigator || "-"}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-amber-100/70 text-[var(--brand-primary-strong)] text-xs font-medium">
                          {book.classification}
                        </span>
                      </td>
                      <td className="px-2 py-4">{book.volumes}</td>
                      <td className="px-6 py-4">{book.edition || "-"}</td>
                      <td className="px-9 py-4">{book.code || "-"}</td>
                      {!isReadOnly && (
                        <td className="px-9 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingBook(book);
                                setIsModalOpen(true);
                              }}
                              className="p-2 text-amber-500 hover:bg-amber-100 hover:text-[var(--brand-primary)] rounded-lg transition"
                              title="تعديل"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(book.id)}
                              className="p-2 text-amber-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
              {paginatedBooks.map((book) => (
                <div
                  key={book.id}
                  className="bg-[var(--brand-surface)] p-5 rounded-2xl shadow-sm border border-amber-100 flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-[var(--brand-ink)] leading-tight pr-2">
                      {book.name}
                    </h3>
                    {!isReadOnly && (
                      <div className="flex items-center gap-1 shrink-0 bg-amber-50 rounded-lg p-1">
                        <button
                          onClick={() => {
                            setEditingBook(book);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-amber-500 hover:text-[var(--brand-primary)] rounded-md transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(book.id)}
                          className="p-1.5 text-amber-500 hover:text-red-600 rounded-md transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-[var(--brand-muted)]">
                    <p>
                      <span className="text-amber-700/70 ml-1">المؤلف:</span>{" "}
                      {book.author}
                    </p>
                    <p>
                      <span className="text-amber-700/70 ml-1">الدار:</span>{" "}
                      {book.publisher}
                    </p>
                    {book.investigator && (
                      <p>
                        <span className="text-amber-700/70 ml-1">المحقق:</span>{" "}
                        {book.investigator}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2 pt-3 border-t border-amber-100">
                    <span className="inline-flex px-2 py-1 rounded bg-amber-100/70 text-[var(--brand-primary-strong)] text-xs font-medium">
                      {book.classification}
                    </span>
                    <span className="text-xs text-[var(--brand-muted)]">
                      {book.volumes} {book.volumes === "1" ? "مجلد" : "مجلدات"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 py-4 mt-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-amber-200 bg-[var(--brand-surface)] text-[var(--brand-muted)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-50 transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 text-sm font-medium text-[var(--brand-muted)]">
                  <span>
                    صفحة {currentPage} من {totalPages}
                  </span>
                  <span className="text-amber-300 mx-1">|</span>
                  <span className="text-amber-700/70 font-normal">
                    إجمالي {filteredBooks.length} كتاب
                  </span>
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-amber-200 bg-[var(--brand-surface)] text-[var(--brand-muted)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-50 transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <BookFormModal
            book={editingBook}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveBook}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
