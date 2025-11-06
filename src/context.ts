// src/context.ts

/**
 * État d'authentification conservé côté serveur (session en mémoire).
 */
export type AuthState = {
    ok: boolean;
    SHOPID?: string;
    APIKEY?: string;
    scopes?: string[];
};

/**
 * Stockage de session minimaliste (en mémoire de process).
 * Remplace si besoin par un store persistant selon ton runtime.
 */
const SESSION: { auth?: AuthState } = {};

/** Définit l'état d'authentification pour la session courante. */
export function setSessionAuth(a: AuthState) {
    SESSION.auth = a;
}

/** Récupère l'état d'authentification de la session courante. */
export function getSessionAuth(): AuthState | undefined {
    return SESSION.auth;
}

/** Efface l'état d'authentification de la session courante. */
export function clearSessionAuth() {
    delete SESSION.auth;
}

/**
 * Contexte passé aux handlers de tools.
 * (Laisse-le aligné avec ce que ton serveur MCP injecte déjà.)
 */
export type Ctx = {
    auth?: AuthState;
    // ... ajoute d'autres champs spécifiques à ton serveur si besoin
};

/**
 * Résolution unifiée des identifiants :
 * 1) session (ctx.auth puis SESSION)
 * 2) variables d'environnement (SHOPID/APIKEY ou MCP_SHOPID/MCP_APIKEY)
 *
 * Les tools n'ont plus besoin de recevoir shopId/apiKey en paramètres.
 * Lève une erreur explicite si les identifiants sont introuvables.
 */
export function resolveAuth(
    _input?: unknown,
    ctx?: Ctx
): { shopId: string; apiKey: string } {
    // Priorité session: d'abord le ctx reçu par le handler (si ton serveur l'alimente),
    // puis le store global en mémoire.
    const sessionAuth = ctx?.auth ?? getSessionAuth();

    const shopId =
        sessionAuth?.SHOPID ??
        process.env.SHOPID ??
        process.env.MCP_SHOPID ??
        '';

    const apiKey =
        sessionAuth?.APIKEY ??
        process.env.APIKEY ??
        process.env.MCP_APIKEY ??
        '';

    if ( !apiKey) {
        throw new Error(
            'Identifiants manquants : SHOPID et/ou APIKEY introuvables (session/env). ' +
            'Connectez-vous via auth.login, définissez SHOPID/APIKEY en variables d’environnement, ' +
            'ou configurez les headers Authorization (Bearer) + X-Shop-Id côté client.'
        );
    }

    return { shopId, apiKey };
}
