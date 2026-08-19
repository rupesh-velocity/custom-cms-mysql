'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Image as ImageIcon, BookOpen, ShoppingBag } from 'lucide-react';

interface ShopItem {
  id: string;
  originalId: number;
  type: 'course' | 'product';
  title: string;
  slug: string;
  image: string | null;
  price: number | null;
  salePrice: number | null;
  url: string;
}

export default function ShopClient({ initialItems, mode = 'all' }: { initialItems: ShopItem[], mode?: 'all' | 'courses' | 'products' }) {
  const [items] = useState<ShopItem[]>(initialItems);
  const [filter, setFilter] = useState<'all' | 'course' | 'product'>(mode === 'courses' ? 'course' : mode === 'products' ? 'product' : 'all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === 'all' || item.type === filter;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="shop-client-wrapper py-2">
      <div className="container mx-auto max-w-7xl">
        {/* Toolbar */}
        <div className="shop-toolbar flex flex-col md:flex-row justify-between items-center gap-6 mb-12 pb-8">
          
          {mode === 'all' ? (
            <div className="shop-filter-group flex w-full md:w-auto">
              <button
                onClick={() => setFilter('all')}
                className={`shop-filter-btn flex-1 flex items-center justify-center ${filter === 'all' ? 'active' : ''}`}
              >
                All Items
              </button>
              <button
                onClick={() => setFilter('course')}
                className={`shop-filter-btn flex-1 flex items-center justify-center gap-2 ${filter === 'course' ? 'active' : ''}`}
              >
                <BookOpen size={16} />
                Courses
              </button>
              <button
                onClick={() => setFilter('product')}
                className={`shop-filter-btn flex-1 flex items-center justify-center gap-2 ${filter === 'product' ? 'active' : ''}`}
              >
                <ShoppingBag size={16} />
                Products
              </button>
            </div>
          ) : (
            <div className="shop-title w-full md:w-auto">
              {mode === 'courses' ? 'Explore Courses' : 'Explore Products'}
            </div>
          )}

          <div className="shop-search-wrapper relative w-full md:w-96">
            <Search className="shop-search-icon absolute top-1/2 -translate-y-1/2" size={18} />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="shop-search-input w-full"
            />
          </div>
        </div>

        {/* Flex Grid System (Matching your reference) */}
        {filteredItems.length > 0 ? (
          <div className="shop-grid flex flex-wrap gap-y-5 -mx-3">
            {filteredItems.map(item => (
              <div key={item.id} className="w-full sm:w-1/2 lg:w-1/3 xl:w-1/4 px-3">
                <Link href={item.url} className="shop-card flex flex-col h-full">
                  <div className="shop-card-img-wrap relative flex items-center justify-center">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="shop-card-img w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={48} className="shop-placeholder-icon" />
                    )}
                    <div className="shop-card-badge-wrap absolute z-10">
                      <span className={`shop-card-badge ${item.type === 'course' ? 'course-badge' : 'product-badge'}`}>
                        {item.type === 'course' ? 'Course' : 'Product'}
                      </span>
                    </div>
                    {/* Subtle gradient overlay */}
                    <div className="shop-card-overlay absolute inset-0"></div>
                  </div>
                  
                  <div className="shop-card-content flex flex-col flex-1 relative z-20">
                    <h3 className="shop-card-title">
                      {item.title}
                    </h3>
                    
                    <div className="shop-card-footer mt-auto flex items-center justify-between">
                      <div className="shop-card-price-wrap flex items-center gap-2">
                        {item.price !== null ? (
                          <>
                            {item.salePrice ? (
                              <div className="shop-card-price-sale-wrap flex flex-col">
                                <span className="shop-card-price-sale">${item.salePrice.toFixed(2)}</span>
                                <span className="shop-card-price-original">${item.price.toFixed(2)}</span>
                              </div>
                            ) : (
                              <span className="shop-card-price-regular">${item.price.toFixed(2)}</span>
                            )}
                          </>
                        ) : (
                          <span className="shop-card-details-link">View Details</span>
                        )}
                      </div>
                      <span className="shop-card-arrow flex items-center justify-center">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="shop-empty-state text-center">
            <ShoppingBag size={56} className="shop-empty-icon mx-auto" />
            <h3 className="shop-empty-title">No items found</h3>
            <p className="shop-empty-desc mx-auto">Try adjusting your filters or search query to find what you're looking for.</p>
            <button 
              onClick={() => { setFilter('all'); setSearchQuery(''); }}
              className="shop-empty-btn"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}