import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, context: any) {
  try {
    const params = await context.params;
    const menuId = parseInt(params.id);
    
    if (isNaN(menuId)) {
      return NextResponse.json({ error: 'Invalid Menu ID' }, { status: 400 });
    }

    const menu = await prisma.menu.findUnique({
      where: { id: menuId },
      include: {
        items: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    return NextResponse.json(menu);
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: any) {
  try {
    const params = await context.params;
    const menuId = parseInt(params.id);
    
    if (isNaN(menuId)) {
      return NextResponse.json({ error: 'Invalid Menu ID' }, { status: 400 });
    }

    const data = await req.json();
    const { name, slug, items } = data;

    // Use a transaction to update menu and recreate items
    const menu = await prisma.$transaction(async (tx) => {
      // Update basic details if provided
      const updatedMenu = await tx.menu.update({
        where: { id: menuId },
        data: {
          name: name !== undefined ? name : undefined,
          slug: slug !== undefined ? slug : undefined,
        },
      });

      // If items array is provided, replace all items
      if (Array.isArray(items)) {
        await tx.menuItem.deleteMany({
          where: { menuId },
        });

        if (items.length > 0) {
          const idMap = new Map(); // Maps frontend ID to new DB ID

          let remaining = [...items];
          while (remaining.length > 0) {
            const batch = remaining.filter(item => !item.parentId || idMap.has(item.parentId));
            if (batch.length === 0) break; // Safety against infinite loop

            for (const item of batch) {
              const created = await tx.menuItem.create({
                data: {
                  label: item.label,
                  url: item.url,
                  order: item.order,
                  menuId: menuId,
                  parentId: item.parentId ? idMap.get(item.parentId) : null
                }
              });
              idMap.set(item.id, created.id);
            }
            remaining = remaining.filter(item => !batch.includes(item));
          }
        }
      }

      // Fetch the final result
      return tx.menu.findUnique({
        where: { id: menuId },
        include: {
          items: {
            orderBy: { order: 'asc' }
          }
        }
      });
    });

    return NextResponse.json(menu);
  } catch (error: any) {
    console.error('Error updating menu:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A menu with this slug already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update menu' }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: any) {
  try {
    const params = await context.params;
    const menuId = parseInt(params.id);
    
    if (isNaN(menuId)) {
      return NextResponse.json({ error: 'Invalid Menu ID' }, { status: 400 });
    }

    await prisma.menu.delete({
      where: { id: menuId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu:', error);
    return NextResponse.json({ error: 'Failed to delete menu' }, { status: 500 });
  }
}
