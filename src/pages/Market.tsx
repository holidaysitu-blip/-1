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
      image_url: 'https://images.unsplash.com/photo-1511914265872-c40672604a80?q=80&w=800&auto=format&fit=crop',
      tag: '园主推荐'
    },
    {
      id: '2',
      name: '手工艾草枕',
      description: '精选陈年艾绒，棉麻布艺，安神助眠。',
      price: 88,
      image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop'
    },
    {
      id: '3',
      name: '明前龙井·雅集定制',
      description: '核心产区，鲜爽甘醇，茶室特供。',
      price: 298,
      image_url: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?q=80&w=800&auto=format&fit=crop'
    },
    {
      id: '4',
      name: '沉水线香礼盒',
      description: '天然香材，气韵清雅，适合读书打坐。',
      price: 168,
      image_url: 'https://images.unsplash.com/photo-1620843236055-6b744ce094c9?q=80&w=800&auto=format&fit=crop',
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
            className="group bg-white rounded-xl overflow-hidden border-[0.5px] border-primary/10 shadow-sm flex flex-col"
          >
            <div className="relative aspect-square overflow-hidden bg-[#F7F7F7]">
              <img 
                src={product.image_url} 
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {product.tag && (
                <div className="absolute top-2 left-2 bg-primary/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  {product.tag}
                </div>
              )}
            </div>
            
            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-primary">{product.name}</h3>
                <p className="text-xs text-slate-500 mt-2 line-clamp-1">{product.description}</p>
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
