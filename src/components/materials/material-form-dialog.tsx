"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MaterialFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { code: string; name: string; unit: string; group?: string; description?: string }) => Promise<void>;
  isSubmitting: boolean;
}

export function MaterialFormDialog({ isOpen, onClose, onSubmit, isSubmitting }: MaterialFormDialogProps) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    unit: "",
    group: "",
    description: "",
  });
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) return setError("Tên vật tư là bắt buộc");
    if (!formData.unit.trim()) return setError("Đơn vị tính là bắt buộc");

    try {
      await onSubmit(formData);
      setFormData({ code: "", name: "", unit: "", group: "", description: "" });
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Thêm vật tư mới</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mã vật tư <span className="text-slate-400 font-normal">(Tùy chọn)</span></label>
            <input 
              type="text" 
              value={formData.code} 
              onChange={e => setFormData({ ...formData, code: e.target.value })}
              placeholder="VD: THEP-D10"
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tên vật tư <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Thép cuộn D10"
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Đơn vị tính <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={formData.unit} 
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                placeholder="VD: kg"
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nhóm vật tư</label>
              <input 
                type="text" 
                value={formData.group} 
                onChange={e => setFormData({ ...formData, group: e.target.value })}
                placeholder="VD: Thép"
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
            <textarea 
              value={formData.description} 
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Thông tin thêm về vật tư này..."
              className="w-full p-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : "Tạo vật tư"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
