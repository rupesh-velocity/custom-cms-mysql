import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import slugify from 'slugify';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const product = await prisma.product.findUnique({
      where: { id: parseInt(resolvedParams.id) },
      include: { 
        categories: true,
        attributes: true,
        variations: true
      }
    });
    
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const data = await req.json();
    
    const product = await prisma.product.update({
      where: { id: parseInt(resolvedParams.id) },
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
        linkedCourseId: data.linkedCourseId ? parseInt(data.linkedCourseId) : null,
        featuredImage: data.featuredImage || null,
        attributes: {
          deleteMany: {},
          create: data.attributes ? data.attributes.map((attr: any) => ({
            name: attr.name,
            options: attr.options,
            visible: attr.visible !== undefined ? attr.visible : true,
            variation: attr.variation !== undefined ? attr.variation : false,
            isGlobal: attr.isGlobal !== undefined ? attr.isGlobal : false
          })) : []
        },
        variations: {
          deleteMany: {},
          create: data.variations ? data.variations.map((v: any) => ({
            attributes: v.attributes,
            price: v.price ? parseFloat(v.price) : 0,
            salePrice: v.salePrice ? parseFloat(v.salePrice) : null,
            sku: v.sku || null,
            manageStock: v.manageStock || false,
            stockQuantity: parseInt(v.stockQuantity) || 0
          })) : []
        }
      },
      include: {
        attributes: true,
        variations: true
      }
    });
    
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const data = await req.json();
    const product = await prisma.product.update({
      where: { id: parseInt(resolvedParams.id) },
      data: { status: data.status }
    });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product status' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    await prisma.product.delete({
      where: { id: parseInt(resolvedParams.id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
