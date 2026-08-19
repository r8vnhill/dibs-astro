import {
    getNotFoundMessages,
    getTodoImages,
    getUltraRareNotFoundMessage,
} from "$infrastructure/adapters/StaticUiDataAdapter";

export const getNotFoundMessagePool = (): readonly string[] => getNotFoundMessages();

export const getRareNotFoundMessage = (): string => getUltraRareNotFoundMessage();

export const getPlaceholderImagePool = (): readonly string[] => getTodoImages();
