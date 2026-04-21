import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Camera, Search, Plus, Trash2, Edit2, LogIn, Save, X, Loader2, Link as LinkIcon, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

interface Book {
  id: number;
  name: string;
  author: string;
  publisher: string;
  investigator: string;
  classification: string;
  volumes: string;
  notes: string;
}

export default function App() {
  const [configStatus, setConfigStatus] = useState<'checking' | 'configured' | 'unconfigured'>('checking');
  const [user, setUser] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Check backend configuration
  useEffect(() => {
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => {
        setConfigStatus(data.configured ? 'configured' : 'unconfigured');
      })
      .catch(() => setConfigStatus('unconfigured'));

    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) throw new Error('Not logged in');
        return res.json();
      })
      .then(data => {
        setUser(data);
        setIsLoadingAuth(false);
      })
      .catch(() => {
        setUser(null);
        setIsLoadingAuth(false);
      });
  }, []);

  const handleLogin = async () => {
    try {
      const res = await fetch(`/api/auth/url?origin=${encodeURIComponent(window.location.origin)}`);
      const { url } = await res.json();
      const popup = window.open(url, 'google_login', 'width=500,height=600');
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          // Reload user
          fetch('/api/auth/me')
            .then(r => r.json())
            .then(u => setUser(u));
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (e) {
      alert('فشل في بدء تسجيل الدخول');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  if (configStatus === 'checking' || isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (configStatus === 'unconfigured') {
    return <SetupScreen />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <BookOpen className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">إدارة المكتبة</h1>
          <p className="text-slate-600 leading-relaxed">
            قم بتسجيل الدخول بحساب Google للوصول إلى جداول البيانات الخاصة بك وإدارة كتبك بسهولة.
          </p>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white rounded-xl py-3 px-4 font-semibold hover:bg-slate-700 transition"
          >
            <LogIn className="w-5 h-5" />
            <span>تسجيل الدخول باستخدام Google</span>
          </button>
        </div>
      </div>
    );
  }

  return <LibraryManager user={user} onLogout={handleLogout} />;
}

// ----------------------------------------------------
// Setup Screen for Missing Env Vars
// ----------------------------------------------------
function SetupScreen() {
  return (
    <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
      <div className="max-w-2xl bg-white p-8 rounded-2xl shadow-lg space-y-6">
        <div className="flex items-center gap-4 text-emerald-600 mb-2">
          <Settings className="w-8 h-8" />
          <h1 className="text-2xl font-bold text-slate-900">إعداد التطبيق مطلوب</h1>
        </div>
        <p className="text-slate-600 text-lg">
          لاستخدام هذا التطبيق، يجب إعداد بيانات اعتماد <strong>Google OAuth</strong> في المتغيرات البيئية <span className="dir-ltr text-sm inline-block bg-slate-100 px-2 py-1 rounded font-mono">.env</span> (في قائمة Settings).
        </p>
        <div className="bg-slate-100 rounded-lg p-5 mt-4 space-y-4">
          <h3 className="font-semibold text-slate-800">الخطوات:</h3>
          <ol className="list-decimal list-inside space-y-3 text-slate-700 leading-relaxed">
            <li>اذهب إلى <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-emerald-600 font-medium hover:underline">Google Cloud Console</a>.</li>
            <li>قم بإنشاء مشروع جديد وفعل <strong>Google Sheets API</strong>.</li>
            <li>اذهب إلى Credentials وأنشئ <strong>OAuth Client ID</strong> من نوع Web Application.</li>
            <li>أضف رابط التحويل (Redirect URI): <br/><code className="bg-slate-200 px-2 py-1 rounded text-sm dir-ltr inline-block mt-1">{window.location.origin}/auth/callback</code></li>
            <li>انسخ المعرف (Client ID) والسر (Client Secret) وضعهم في <code className="bg-slate-200 px-2 py-1 rounded text-sm dir-ltr inline-block">OAUTH_CLIENT_ID</code> و <code className="bg-slate-200 px-2 py-1 rounded text-sm dir-ltr inline-block">OAUTH_CLIENT_SECRET</code>.</li>
          </ol>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-emerald-600 text-white rounded-xl py-3 font-semibold hover:bg-emerald-700 transition"
        >
          لقد قمت بإضافة المتغيرات (تحديث)
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Main Library Application
// ----------------------------------------------------
function LibraryManager({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [sheetId, setSheetId] = useState(() => localStorage.getItem('library_sheet_id') || '');
  const [isSheetSet, setIsSheetSet] = useState(!!sheetId);
  
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const fetchBooks = async () => {
    if (!sheetId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/books?sheetId=${sheetId}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'فشل في تحميل البيانات');
      }
      const data = await res.json();
      // Only keep rows that have actual data
      setBooks(data.filter((b: Book) => b.name || b.author || b.publisher));
    } catch (e: any) {
      if (e.message?.includes('insufficient authentication scopes')) {
        alert('حدث خطأ في الصلاحيات: \nلم تقم بالموافقة على وصول التطبيق للجداول (Google Sheets). الرجاء تسجيل الدخول مجدداً والتأكد من تحديد علامة (صح) بجانب صلاحية قراءة وتعديل جداول البيانات.');
        onLogout(); // Force logout to let them try again
      } else if (e.message?.includes('not found')) {
        alert('حدث خطأ: لم يتم العثور على جدول البيانات! \n\nتأكد من:\n1. أن المعرف (Sheet ID) صحيح تماماً ولا يحتوي على الحروف الإضافية في الرابط.\n2. أنك قمت بإنشاء الجدول باستخدام الحساب الذي دخلت به.');
      } else {
        alert(`تعذر جلب البيانات: ${e.message}\nتأكد من أن المعرف صحيح ومن صلاحيات الوصول.`);
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

  const handleSetSheet = (e: React.FormEvent) => {
    e.preventDefault();
    let id = sheetId.trim();
    if (id.includes('/d/')) {
      const match = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) id = match[1];
    }
    if (id) {
      setSheetId(id);
      localStorage.setItem('library_sheet_id', id);
      setIsSheetSet(true);
    }
  };

  const handleSaveBook = async (book: Partial<Book>) => {
    if (!sheetId) return;
    const isEditing = !!editingBook;
    const url = isEditing ? `/api/books/${editingBook.id}` : '/api/books';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book, sheetId })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'حدث خطأ غير معروف في الخادم');
      }
      setIsModalOpen(false);
      fetchBooks(); // Refresh list
    } catch (e: any) {
      alert(`فشل في حفظ الكتاب: ${e.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكتاب؟')) return;
    try {
      const res = await fetch(`/api/books/${id}`, {
        method: 'DELETE',
        headers: { 'x-sheet-id': sheetId }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'حدث خطأ غير معروف في الخادم');
      }
      fetchBooks();
    } catch (e: any) {
      alert(`فشل في مسح الكتاب: ${e.message}`);
    }
  };

  if (!isSheetSet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
          <button onClick={onLogout} className="text-slate-500 hover:text-red-600 font-medium transition flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
            <LogIn className="w-4 h-4 rotate-180" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
        <form onSubmit={handleSetSheet} className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-800">معرف جدول البيانات</h2>
            <p className="text-slate-500 text-sm">أدخل معرف (ID) الخاص بجدول Google Sheets ليتم استخدامه كقاعدة بيانات.</p>
          </div>
          <div>
            <input
              type="text"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder="مثال: 1BxiMVs0XRYFgwnAKB... أو رابط الجدول كامل"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr"
              required
            />
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white rounded-xl py-3 font-semibold hover:bg-emerald-700 transition">
            متابعة
          </button>
        </form>
      </div>
    );
  }

  const filteredBooks = books.filter(b => 
    b.name.includes(searchQuery) || 
    b.author.includes(searchQuery) ||
    b.classification.includes(searchQuery) ||
    b.publisher.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xl">
            <BookOpen className="w-6 h-6" />
            <span>المكتبة</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
              <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
              <span>{user.name}</span>
            </div>
            <button
              onClick={() => {
                setIsSheetSet(false);
                localStorage.removeItem('library_sheet_id');
              }}
              className="text-slate-500 hover:text-slate-900 transition"
              title="تغيير جدول البيانات"
            >
              <LinkIcon className="w-5 h-5" />
            </button>
            <button onClick={onLogout} className="text-slate-500 hover:text-red-600 text-sm font-medium transition">
              خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث باسم الكتاب، المؤلف، أو التصنيف..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl pr-10 pl-4 py-2.5 focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>
          <button
            onClick={() => { setEditingBook(null); setIsModalOpen(true); }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة كتاب</span>
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>جاري تحميل الكتب...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg">لا توجد كتب هنا.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-6 py-4 font-semibold">اسم الكتاب</th>
                    <th className="px-6 py-4 font-semibold">المؤلف</th>
                    <th className="px-6 py-4 font-semibold">دار النشر</th>
                    <th className="px-6 py-4 font-semibold">المحقق</th>
                    <th className="px-6 py-4 font-semibold">التصنيف</th>
                    <th className="px-6 py-4 font-semibold">المجلدات</th>
                    <th className="px-6 py-4 font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredBooks.map(book => (
                    <tr key={book.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 font-medium text-slate-900">{book.name}</td>
                      <td className="px-6 py-4">{book.author}</td>
                      <td className="px-6 py-4">{book.publisher}</td>
                      <td className="px-6 py-4">{book.investigator || '-'}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                          {book.classification}
                        </span>
                      </td>
                      <td className="px-6 py-4">{book.volumes}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setEditingBook(book); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 rounded-lg transition" title="تعديل">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(book.id)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition" title="حذف">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
              {filteredBooks.map(book => (
                <div key={book.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-900 leading-tight pr-2">{book.name}</h3>
                    <div className="flex items-center gap-1 shrink-0 bg-slate-50 rounded-lg p-1">
                       <button onClick={() => { setEditingBook(book); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md transition">
                         <Edit2 className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDelete(book.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition">
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p><span className="text-slate-400 ml-1">المؤلف:</span> {book.author}</p>
                    <p><span className="text-slate-400 ml-1">الدار:</span> {book.publisher}</p>
                    {book.investigator && <p><span className="text-slate-400 ml-1">المحقق:</span> {book.investigator}</p>}
                  </div>
                  <div className="flex items-center gap-3 mt-2 pt-3 border-t border-slate-100">
                     <span className="inline-flex px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-medium">
                       {book.classification}
                     </span>
                     <span className="text-xs text-slate-500">{book.volumes} {book.volumes === '1' ? 'مجلد' : 'مجلدات'}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Form Modal */}
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

// ----------------------------------------------------
// Add/Edit Book Modal & AI Scanning
// ----------------------------------------------------
function BookFormModal({ book, onClose, onSave }: { book: Book | null, onClose: () => void, onSave: (b: Partial<Book>) => void }) {
  const [formData, setFormData] = useState<Partial<Book>>(book || {
    name: '', author: '', publisher: '', investigator: '', classification: '', volumes: '1', notes: ''
  });
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    const formDataPayload = new FormData();
    formDataPayload.append('cover', file);

    try {
      const res = await fetch('/api/books/extract', {
        method: 'POST',
        body: formDataPayload
      });
      if (!res.ok) throw new Error('فشل في تحليل الصورة');
      const data = await res.json();
      
      setFormData(prev => ({
        ...prev,
        ...data // Merges bookName as name? Wait, backend returned bookName
      }));
      if (data.bookName) setFormData(prev => ({ ...prev, name: data.bookName }));
    } catch (err) {
      alert('لم نتمكن من استخراج البيانات من الصورة بنجاح.');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">{book ? 'تعديل بيانات الكتاب' : 'إضافة كتاب جديد'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-full shadow-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="mb-6">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="w-full border-2 border-dashed border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-2xl py-6 flex flex-col items-center justify-center gap-3 transition"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="font-medium">جاري تحليل الغلاف بالذكاء الاصطناعي...</span>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center">
                    <Camera className="w-6 h-6 text-emerald-600" />
                  </div>
                  <span className="font-medium">التقط أو ارفع صورة الغلاف لملء البيانات تلقائياً</span>
                </>
              )}
            </button>
            <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          </div>

          <form id="book-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-medium text-slate-700">اسم الكتاب *</label>
              <input required name="name" value={formData.name || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">المؤلف *</label>
              <input required name="author" value={formData.author || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">دار النشر</label>
              <input name="publisher" value={formData.publisher || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">المحقق</label>
              <input name="investigator" value={formData.investigator || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">التصنيف</label>
              <input name="classification" value={formData.classification || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">عدد المجلدات</label>
              <input type="number" name="volumes" value={formData.volumes || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="md:col-span-2 space-y-1 mt-2">
              <label className="text-sm font-medium text-slate-700">ملاحظات</label>
              <textarea name="notes" rows={2} value={formData.notes || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500" />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition">
            إلغاء
          </button>
          <button type="submit" form="book-form" className="px-5 py-2.5 rounded-xl font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-2">
            <Save className="w-4 h-4" />
            <span>حفظ البيانات</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
