import { notFoundMessages, ultraRareMessage } from "~/data/not-found-messages";
import { todoImages } from "~/data/todo-images";

export const getNotFoundMessages = (): readonly string[] => notFoundMessages;

export const getUltraRareNotFoundMessage = (): string => ultraRareMessage;

export const getTodoImages = (): readonly string[] => todoImages;
