import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, ZodTypeAny } from 'zod';
import { get } from '../support/http.js';
import { t } from '../i18n/index.js';
import { type Ctx, resolveAuth } from '../context.js';

/** Util pour typer un handler depuis un "shape" */
type InferFromShape<S extends Record<string, ZodTypeAny>> = z.infer<z.ZodObject<S>>;

/** Entrées communes à toutes les listes */
const CommonShape = {
    format: z.enum(['json', 'csv', 'html']).default('json'),
} satisfies Record<string, ZodTypeAny>;

const getOrderShape = {
    order_id: z.number().int(),
} satisfies Record<string, ZodTypeAny>;

const getOrdersShape = {
    validatedOrders: z.boolean(),
    from_date_ISO8601: z.string().datetime(),
    to_date_ISO8601: z.string().datetime(),
    filterDeliveryMethod: z.union([
        z.number().int().min(0).max(6),
        z.enum(['0', '1', '2', '3', '4', '5', '6'])
    ]).transform((v) => Number(v)).optional(),
} satisfies Record<string, ZodTypeAny>;

type CommonArgs = InferFromShape<typeof CommonShape>;
type getOrderArgs = InferFromShape<typeof getOrderShape>;
type getOrdersArgs = InferFromShape<typeof getOrdersShape>;
function safeStringify(value: any, space = 2, maxLen = 4000) {
    try {
        const cache = new WeakSet();
        const s = JSON.stringify(
            value,
            (k, v) => {
                if (typeof v === 'bigint') return v.toString(); // éviter l’erreur BigInt
                if (typeof v === 'object' && v !== null) {
                    if (cache.has(v)) return '[Circular]';
                    cache.add(v);
                }
                return v;
            },
            space
        );
        return s.length > maxLen ? s.slice(0, maxLen) + '…(truncated)' : s;
    } catch (e) {
        return `[unstringifiable: ${(e as Error).message}]`;
    }
}
function structData(data: any) {
    // on ne touche PAS à structuredContent (c’est ce que ChatGPT utilise)
    const light = Array.isArray(data)
        ? data.slice(0, 5000)//.map(({ id, nom, email, tel, ...r }) => ({ id, nom, email, tel }))
        : data;

    const maxLength = 40000;
    const preview =
        typeof light === 'string'
            ? (light.length > maxLength ? light.slice(0, maxLength) + '…(truncated)' : light)
            : safeStringify(light, 2, maxLength);   // <-- aperçu court et “safe”
    const wrapped =
        Array.isArray(data)
            ? { data: data }
            : data && typeof data === 'object'
                ? data
                : { data: data };
    return {
        content: [{ type: 'text', text: preview }],
        structuredContent: wrapped,
    };
}
/** Fabrique un tool "liste" minimaliste */
function registerSimple(
    server: McpServer | any,
    toolName: string,
    path: string,
    title: string,
    entityLabel: string
) {
    server.registerTool(
        toolName,
        {
            title,
            description: `Liste des ${entityLabel}`,
            inputSchema: CommonShape, // ZodRawShape,
            annotations: { readOnlyHint: true }
        },
        async ({ format }: CommonArgs, ctx: Ctx) => {
            try {
                const { shopId, apiKey } = resolveAuth(undefined, ctx);
                const data = await get(path, { idboutique: shopId, key: apiKey, format });

                process.stderr.write(
                    `[caisse][tool:${toolName}] ok type=${Array.isArray(data) ? 'array' : typeof data}`
                    + (Array.isArray(data) ? ` len=${data.length}` : '')
                    + '\n'
                );
                //Array.isArray(data) ? data.slice(0, 50) : data
                const funcResult = structData( data);
                process.stderr.write(`[caisse][RES]  ${JSON.stringify(data)} \n`);
                process.stderr.write(`[caisse][RES] funcResult ${JSON.stringify(funcResult)} \n`);
                return funcResult;
                //return { content, structuredContent: isText ? undefined : data };
            } catch (e) {
                process.stderr.write(`[caisse][tool:${toolName}][error]\n`);
                process.stderr.write(`[caisse][tool:${toolName}][error] ${(e as Error).message}\n`);
                // renvoyer un message "propre" plutôt que laisser l’exception devenir un 424
                return {
                    content: [{ type: 'text', text: `Erreur pendant la préparation de la réponse: ${(e as Error).message}` }],
                    is_error: true,
                };
            }
        }
    );
}

export function registerDataTools(server: McpServer | any) {
    //  Garde les mêmes endpoints que ton backend PHP
    // Noms de tools avec UNDERSCORE (comme vus dans tes logs) t('tools.sale_create.title')
    registerSimple(server, 'data_list_products', '/workers/getPlus.php', t('tools.data_list_products.description'), t('tools.data_list_products.title'));
    registerSimple(server, 'data_list_departments', '/workers/getDepartments.php', t('tools.data_list_departments.description'), t('tools.data_list_departments.title'));
    registerSimple(server, 'data_list_department_groups', '/workers/getDepartmentsGroups.php', t('tools.data_list_department_groups.description'), t('tools.data_list_department_groups.title'));
    registerSimple(server, 'data_list_clients', '/workers/getClients.php', t('tools.data_list_clients.description'), t('tools.data_list_clients.title'));
    registerSimple(server, 'data_list_variations', '/workers/getDeclinaisons.php', t('tools.data_list_variations.description'), t('tools.data_list_variations.title'));
    registerSimple(server, 'data_list_delivery_men', '/workers/getLivreurs.php', t('tools.data_list_delivery_men.description'), t('tools.data_list_delivery_men.title'));
    registerSimple(server, 'data_list_payments_modes', '/workers/getPaymentModes.php', t('tools.data_list_payments.description'), t('tools.data_list_payments.title'));
    registerSimple(server, 'data_list_cashboxes', '/workers/getCashbox.php', t('tools.data_list_cashboxes.description'), t('tools.data_list_cashboxes.title'));
    registerSimple(server, 'data_list_delivery_zones', '/workers/getDeliveryZones.php', t('tools.data_list_delivery_zones.description'), t('tools.data_list_delivery_zones.title'));
    registerSimple(server, 'data_list_relay_points', '/workers/getRelayDeposit.php', t('tools.data_list_relay_points.description'), t('tools.data_list_relay_points.title'));
    registerSimple(server, 'data_list_discounts', '/workers/getDiscounts.php', t('tools.data_list_discounts.description'), t('tools.data_list_discounts.title'));
    registerSimple(server, 'data_list_users', '/workers/getUsers.php', t('tools.data_list_users.description'), t('tools.data_list_users.title'));
    registerSimple(server, 'data_list_tables', '/workers/getTables.php', t('tools.data_list_tables.description'), t('tools.data_list_tables.title'));
    //registerSimple(server, 'data_list_orders', '/workers/getPending.php', t('tools.data_list_orders.description'), t('tools.data_list_orders.title'),);

    server.registerTool(
        'data_list_orders',
        {
            title: t('tools.data_list_orders.title'),
            description: t('tools.data_list_orders.description'),
            inputSchema: getOrdersShape, // ZodRawShape,
            annotations: { readOnlyHint: true }
        },
        async ({ validatedOrders, from_date_ISO8601, to_date_ISO8601, filterDeliveryMethod }: getOrdersArgs, ctx: Ctx) => {
            const { shopId, apiKey } = resolveAuth(undefined, ctx);
            const data = await get('/workers/getOrders.php', { idboutique: shopId, key: apiKey, validatedOrders, from_date_ISO8601, to_date_ISO8601, filterDeliveryMethod });

            return structData(data);
            //return { content, structuredContent: isText ? undefined : data };
        }
    );

    server.registerTool(
        'order_detail',
        {
            title: t('tools.order_detail.title'),
            description: t('tools.order_detail.description'),
            inputSchema: getOrderShape, // ZodRawShape,
            annotations: { readOnlyHint: true }
        },
        async ({ order_id }: getOrderArgs, ctx: Ctx) => {
            const { shopId, apiKey } = resolveAuth(undefined, ctx);
            const data = await get('/workers/getOrder.php', { idboutique: shopId, key: apiKey, order_id });

            return structData(data);
            //return { content, structuredContent: isText ? undefined : data };
        }
    );


    // je pourrais ajouter getReport : obtenir les rapports de vente et getOrders : liste des commandes








}
