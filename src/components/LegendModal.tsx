import React from 'react';
import { CATEGORY_COLORS, RELATION_CONFIG, ALL_CATEGORIES } from '../data';
import { RelationType } from '../types';
import { X, HelpCircle, Layers, Radio, MousePointer } from 'lucide-react';

interface LegendModalProps {
  onClose: () => void;
}

export const LegendModal: React.FC<LegendModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-vazir text-right"
      id="legend-modal-backdrop"
    >
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        id="legend-modal-content"
      >
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">
              راهنمای گراف ژئوپلیتیک و کدهای بصری
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6 custom-scrollbar text-xs">
          {/* Categories */}
          <div>
            <h3 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              کد رنگی دسته‌بندی بازیگران (گره‌ها)
            </h3>
            <div className="space-y-2">
              {ALL_CATEGORIES.map((cat) => {
                const conf = CATEGORY_COLORS[cat];
                return (
                  <div
                    key={cat}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80"
                  >
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: conf.hex }}
                    />
                    <span className="font-bold text-slate-200">{cat}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Relationship Types */}
          <div>
            <h3 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-400" />
              انواع روابط ژئوپلیتیک (یال‌ها و پیوندها)
            </h3>
            <div className="space-y-2">
              {(Object.keys(RELATION_CONFIG) as RelationType[]).map((type) => {
                const rel = RELATION_CONFIG[type];
                return (
                  <div
                    key={type}
                    className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: rel.color }}
                        />
                        <span className="font-bold text-slate-200">{rel.labelFa}</span>
                      </div>
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: `${rel.color}20`,
                          color: rel.color,
                        }}
                      >
                        {rel.strokeDash === '0' ? 'خط ممتد' : 'خط‌چین/نقطه‌چین'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {rel.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interaction Guide */}
          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/30 text-slate-300 space-y-1.5">
            <h4 className="font-bold text-cyan-300 flex items-center gap-1.5 mb-2">
              <MousePointer className="w-4 h-4" />
              نحوه تعامل با گراف:
            </h4>
            <p>• <strong>کلیک روی هر گره:</strong> باز شدن کشوی مشخصات و شناسنامه کامل بازیگر.</p>
            <p>• <strong>نگه داشتن ماوس روی گره:</strong> تمرکز بر روی بازیگر و شبکه همسایگان مستقیم او (کم‌رنگ شدن سایرین).</p>
            <p>• <strong>جابجایی (Drag):</strong> کشیدن گره‌ها جهت بازآرایی و تحلیل فضایی دلخواه.</p>
            <p>• <strong>بزرگ‌نمایی و چرخش:</strong> اسکرول ماوس یا دکمه‌های کنترل گوشه صفحه.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
