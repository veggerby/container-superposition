export function serializeModel<T>(model: T): string {
    return JSON.stringify(model, null, 2);
}
