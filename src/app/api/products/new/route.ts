import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import slugify from 'slugify';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const cookieStore = await cookies();
    const token = cookieStore.get('cms_session')?.value;
    let authorId: any = null;

    if (token) {
      try {
        const secret = new TextEncoder().encode(
          process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production'
        );
        const { payload } = await jwtVerify(token, secret);
        if (payload && payload.id) {
          authorId = payload.id;
        }
      } catch (e) {}
    }

    const product = await prisma.product.create({
      data: {
        title: data.title,
        slug: data.slug || slugify(data.title, { lower: true, strict: true }),
        description: data.description,
        type: data.type,
        price: data.price ? parseFloat(data.price) : 0,
        salePrice: data.salePrice ? parseFloat(data.salePrice) : null,
        sku: data.sku || null,
        manageStock: data.manageStock,
        stockQuantity: parseInt(data.stockQuantity) || 0,
        status: data.status,
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
        linkedCourseId: data.linkedCourseId ? parseInt(data.linkedCourseId) : undefined,
        featuredImage: data.featuredImage || null,
        authorId: authorId ? Number(authorId) : undefined,
        attributes: data.attributes && data.attributes.length > 0 ? {
          create: data.attributes.map((attr: any) => ({
            name: attr.name,
            options: attr.options,
            visible: attr.visible !== undefined ? attr.visible : true,
            variation: attr.variation !== undefined ? attr.variation : false,
            isGlobal: attr.isGlobal !== undefined ? attr.isGlobal : false
          }))
        } : undefined,
        variations: data.variations && data.variations.length > 0 ? {
          create: data.variations.map((v: any) => ({
            attributes: v.attributes,
            price: v.price ? parseFloat(v.price) : 0,
            salePrice: v.salePrice ? parseFloat(v.salePrice) : null,
            sku: v.sku || null,
            manageStock: v.manageStock || false,
            stockQuantity: parseInt(v.stockQuantity) || 0
          }))
        } : undefined,
      },
      include: {
        attributes: true,
        variations: true
      }
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
