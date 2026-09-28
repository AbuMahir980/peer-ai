// The questions `init` asks go through this interface, so tests can answer them without a
// terminal and a future non-terminal front end can too.

import * as clack from "@clack/prompts";

export interface Choice<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export interface Prompter {
  intro(title: string): void;
  note(message: string, title?: string): void;
  text(message: string, options?: { initial?: string; placeholder?: string; required?: boolean }): Promise<string>;
  select<T extends string>(message: string, choices: Choice<T>[], initial?: T): Promise<T>;
  multiselect<T extends string>(message: string, choices: Choice<T>[]): Promise<T[]>;
  confirm(message: string, initial?: boolean): Promise<boolean>;
  outro(message: string): void;
}

/** Thrown when the user cancels a question, so nothing is written. */
export class Cancelled extends Error {
  constructor() {
    super("cancelled");
  }
}

function answer<T>(value: T | symbol): T {
  if (clack.isCancel(value) || typeof value === "symbol") throw new Cancelled();
  return value;
}

function options(choices: Choice<string>[]): { value: string; label: string; hint?: string }[] {
  return choices.map((choice) => ({
    value: choice.value,
    label: choice.label,
    ...(choice.hint === undefined ? {} : { hint: choice.hint }),
  }));
}

export function createTerminalPrompter(): Prompter {
  return {
    intro: (title) => {
      clack.intro(title);
    },
    note: (message, title) => {
      clack.note(message, title);
    },
    text: async (message, settings = {}) => {
      const value = await clack.text({
        message,
        ...(settings.placeholder === undefined ? {} : { placeholder: settings.placeholder }),
        ...(settings.initial === undefined ? {} : { initialValue: settings.initial }),
        validate: (input) => (settings.required === true && (input ?? "").trim() === "" ? "Required" : undefined),
      });
      return answer<string>(value).trim();
    },
    select: async <T extends string>(message: string, choices: Choice<T>[], initial?: T) => {
      const value = await clack.select<string>({
        message,
        options: options(choices),
        ...(initial === undefined ? {} : { initialValue: initial }),
      });
      return answer<string>(value) as T;
    },
    multiselect: async <T extends string>(message: string, choices: Choice<T>[]) => {
      const value = await clack.multiselect<string>({ message, options: options(choices), required: false });
      return answer<string[]>(value) as T[];
    },
    confirm: async (message, initial = true) =>
      answer<boolean>(await clack.confirm({ message, initialValue: initial })),
    outro: (message) => {
      clack.outro(message);
    },
  };
}
