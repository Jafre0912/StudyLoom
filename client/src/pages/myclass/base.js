// myclass.studyloom.in pe routes root se chalte hain, main site pe /myclass ke andar
export const IS_MYCLASS_HOST = typeof window !== "undefined" && window.location.hostname.startsWith("myclass.");
const BASE = IS_MYCLASS_HOST ? "" : "/myclass";
export const MC = (p = "/") => (BASE + p).replace(/\/$/, "") || "/";

// Dashboard ke "Join Class" button ka target. Production mein .env mein set karo.
export const MYCLASS_URL = import.meta.env.VITE_MYCLASS_URL || "/myclass";