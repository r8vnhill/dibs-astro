import {
    getNotFoundMessages,
    getTodoImages,
    getUltraRareNotFoundMessage,
} from "$infrastructure/adapters/StaticUiDataAdapter";

export function getNotFoundMessagePool(): readonly string[] {
    return getNotFoundMessages();
}

export function getRareNotFoundMessage(): string {
    return getUltraRareNotFoundMessage();
}

export function getPlaceholderImagePool(): readonly string[] {
    return getTodoImages();
}
