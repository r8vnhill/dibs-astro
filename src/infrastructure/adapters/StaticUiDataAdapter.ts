import { notFoundMessages, ultraRareMessage } from "~/data/not-found-messages";
import { todoImages } from "~/data/todo-images";

export function getNotFoundMessages(): readonly string[] {
    return notFoundMessages;
}

export function getUltraRareNotFoundMessage(): string {
    return ultraRareMessage;
}

export function getTodoImages(): readonly string[] {
    return todoImages;
}
