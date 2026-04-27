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
      image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDfjOV8anqs1gV54W8RZLdJIy5pOJkq6XTI4PBo9Ee7FgAhyyrazv6kvl9i7H3yvMdaGZEy-8H819lnpmHmybTAdNFlnodfOKfUCHhd-PTxLgwhdj5Dgs4eKbr9Dcw1UlmQ0MNwEWXNB4VMUypkhLY10H90_8i0Veo8gR4Xn_Uk9I8VvGW6TBrZ3LQZNEVAetLKtoQx6pPxEpduRL64lJkwt1vg0RSztLbEyfdybMVaQuHBinlm7hzaVaKTNdOPZ15ZEGu8IporxGU',
      tag: '园主推荐'
    },
    {
      id: '2',
      name: '手工艾草枕',
      description: '精选陈年艾绒，棉麻布艺，安神助眠。',
      price: 88,
      image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAC62ZRSw_Wn3dCKJOyoHM1aM76X3KTFEB4BM_79a6R3IUk-0GDYvNoEMLHVOyj3OBQCFN2sYNwlsbjkoqB0I4-GvR8TQKENESPevARH9_1maG4xEmZ3zYC5RwOrFfjseUJFuAkg_cOWbnjfzwZ5nqeZ78zPj_KmObphvjbr8Ny4wSJI4KsRRlA5swDev3EhSXcn9qlYnP8Qq2mAYBb0BLvVC_1wH-kEizfzke3Wb6T18LweY3HkJXSECi99G3ToSl0X8FaCNdJDCs'
    },
    {
      id: '3',
      name: '明前龙井·雅集定制',
      description: '核心产区，鲜爽甘醇，茶室特供。',
      price: 298,
      image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCzOu3Qa77U3KvX-L01Unv64OH9sA-F_CImkTKHbNvbjkuCX-Bzsu1VAToAaF-aj0J8La55mso7buW_dm7obIV_9EYwYwBahdU-e6WTlA_uMvPiFx3FuqYFCHdnbrKL9BZ9sqL1wFo_m0IwpqCLWCtzT_LwWtHGecjKmDkXWZLFQ4CqDLK2mWGHQtLUYLIOzwNP7HEBF3R42tLAeLSpvxO-GaiI-1DFXWHwPYwY7jJoxrWSquezkgwZYbWR_uZIZnossytRvtAKTmQ'
    },
    {
      id: '4',
      name: '沉水线香礼盒',
      description: '天然香材，气韵清雅，适合读书打坐。',
      price: 168,
      image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTm8Z7Lja9gBBFCxSvaFtwSLspYoE8JdbRn-qZGTEtWVsw6oryI_VRiN4UKaGm_Y1Yl0WC4J7uZmrfkLUIHzYO_PM6ZIE86uswyjEKHer_lMzMJdoe4E2dW2aEHaYxKZ66jhP8BHTdKtMyQJZaMdhGms6qrlAkq79TdlK6urt9xWnjf3J2Ae4MwcrL8aJzPomt-F_Ow_lu_TT6oeoGnqgeFKL_YBDxETmOhDd9OdDJr00cRR8o8MdsLb16AUZ7BKnprNHICkuUs5w',
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
