import { useState } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Plus } from 'lucide-react';
import { Product } from '../types';

export default function Market() {
  const products: Product[] = [
    {
      id: '1',
      name: '章园监制秋梨膏',
      description: '古法慢熬，润肺降燥，居家常备之选。',
      price: 128,
      image_url: '',
      tag: '园主推荐'
    },
    {
      id: '2',
      name: '手工艾草枕',
      description: '精选陈年艾绒，棉麻布艺，安神助眠。',
      price: 88,
      image_url: ''
    },
    {
      id: '3',
      name: '明前龙井·雅集定制',
      description: '核心产区，鲜爽甘醇，茶室特供。',
      price: 298,
      image_url: ''
    },
    {
      id: '4',
      name: '沉水线香礼盒',
      description: '天然香材，气韵清雅，适合读书打坐。',
      price: 168,
      image_url: '',
      tag: '园主推荐'
    }
  ];

  return (
    <div className="px-6 py-6 space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-primary">养生市集</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <motion.article 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={product.id}
            className="group bg-white rounded-xl overflow-hidden border-[0.5px] border-primary/10 shadow-sm flex flex-col p-5"
          >
            <div className="flex-1 flex flex-col justify-between gap-4">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-serif font-bold text-primary">{product.name}</h3>
                  {product.tag && (
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded">
                      {product.tag}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg text-accent font-bold">¥{product.price}</span>
                <button className="w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
