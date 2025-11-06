import { z } from 'zod';

export const ClientSchema = z.object({
    nom: z.string().optional(),
    prenom: z.string().optional(),
    email: z.string().optional(),
    telephone: z.string().optional(),
    adresseligne1: z.string().optional(),
    adresseligne2: z.string().optional(),
    commentaireadresse: z.string().optional(),
    codepostal: z.string().optional(),
    ville: z.string().optional(),
    pays: z.string().optional(),
    numtva: z.string().optional(),
    rcs: z.string().optional(),
    codeBarre: z.string().optional(),
    telephone2: z.string().optional(),
    lat: z.string().optional(),
    lng: z.string().optional()
});

/*export const DiscountSchema = z.object({
    mode: z.enum(['amount', 'percent']),
    value: z.number().nonnegative()
});*/

export const ItemCatalogSchema = z.object({
    type: z.literal('catalog'),
    productId: z.number().int().positive(),
    quantity: z.number().positive().default(1),
    titleOverride: z.string().optional(),
    priceOverride: z.number().nonnegative().optional(),
    declinaisons: z.array(z.number().int().positive()).max(5).optional(),
    /*taxRateId: z.number().int().positive().nullable().optional(),
    discounts: z.array(DiscountSchema).optional(),
    note: z.string().optional()*/
});

export const ItemDeptSchema = z.object({
    type: z.literal('dept'),
    departmentId: z.number().int().positive(),
    title: z.string(),
    price: z.number().nonnegative(),
    quantity: z.number().positive().default(1)
});
export const ItemFreeSchema = z.object({
    type: z.literal('free'),
    title: z.string().optional(),
    price: z.number().nonnegative()
});

export const ItemSchema = z.discriminatedUnion('type', [ItemCatalogSchema, ItemDeptSchema,ItemFreeSchema]);

export const SalesCreateInput = z.object({
    /*shopId: z.string(),
    apiKey: z.string(),*/
    idUser: z.number().int().optional(),
    payment: z.union([z.literal(-2), z.literal(-1), z.number()]).optional(),
    deliveryMethod: z.union([
        z.number().int().min(0).max(6),
        z.enum(['0', '1', '2', '3', '4', '5', '6'])
    ]).optional(),
    idtable: z.number().int().optional(),
    idcaisse: z.number().int().optional(),
    numcouverts: z.number().int().optional(),
    publicComment: z.string().optional(),
    privateComment: z.string().optional(),
    pagerNum: z.number().int().optional(),
    idClient: z.number().int().optional(),
    client: ClientSchema.optional(),
    items: z.array(ItemSchema).min(1),
    //orderDiscounts: z.array(DiscountSchema).optional(),
    //metadata: z.record(z.any()).optional(),
    idempotencyKey: z.string().optional()
});

export type TSalesCreateInput = z.infer<typeof SalesCreateInput>;
