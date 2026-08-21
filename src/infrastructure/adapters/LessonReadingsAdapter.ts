import {
    libraryWhatIsReadings,
    publishedReadings,
    selectedTaskGraphsReadings,
    supportScriptsNushellReadings,
    taskGraphsReadings,
} from "~/data/readings/lesson-readings";

export function getLibraryWhatIsReadings() {
    return libraryWhatIsReadings;
}

export function getSupportScriptsNushellReadings() {
    return supportScriptsNushellReadings;
}

export function getTaskGraphsReadings() {
    return taskGraphsReadings;
}

export function getSelectedTaskGraphsReadings() {
    return selectedTaskGraphsReadings;
}

export function getPublishedReadings() {
    return publishedReadings;
}
