# AI features

Features that use AI models.

## AI-01 · An AI's output is untrusted input

Output from an AI model is checked and escaped like any outside input before it's shown, stored, or passed to code, a database, a shell or another service.

**Why:** What a model says can be steered by what it was given, so its output can carry an attack as easily as a user's input can.

**Ask:** Is every AI output in this change checked and escaped before it's used?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | High | `ai-features` | [OWASP Top 10 for LLM Applications 2025, LLM05, Improper Output Handling](https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM05_ImproperOutputHandling.md) |

## AI-02 · An AI's guess is never shown as fact

An AI's answer is shown as a suggestion, never as fact. Anything about safety, health, money or the law also tells the person to check with someone qualified.

**Why:** Models state wrong answers as confidently as right ones, and a wrong answer about whether a plant is safe for a pet can hurt someone.

**Ask:** Does this change show any AI answer as fact, or give safety advice without telling the person to check?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | High | `ai-features` | [OWASP Top 10 for LLM Applications 2025, LLM09, Misinformation](https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM09_Misinformation.md) |

## AI-03 · People know what's sent to an AI service, and nothing sensitive goes without need

People are told what's sent to an AI service before it's sent. Personal or sensitive data is sent only when the feature needs it, and removed when it doesn't.

**Why:** Data sent to a model provider can be logged, kept or used for training, and people didn't agree to that just by using a feature.

**Ask:** Does this change send an AI service anything people haven't been told about, or don't need to send?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | `ai-features` | [OWASP Top 10 for LLM Applications 2025, LLM02, Sensitive Information Disclosure](https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM02_SensitiveInformationDisclosure.md) |

## AI-04 · Content can't change what the model is allowed to do

Instructions to the model and the content it works on are kept apart, and the model's permissions are enforced outside it, so text in a document, email or web page can't change what it's allowed to do.

**Why:** A line hidden in a web page can tell a model to ignore its instructions, and the model can't reliably tell instructions from content.

**Ask:** Could content the model reads in this change make it do something it shouldn't?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | `ai-features` | [OWASP Top 10 for LLM Applications 2025, LLM01, Prompt Injection](https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM01_PromptInjection.md) |

## AI-05 · An AI does only what it needs to, and a person confirms what matters

An AI can call only the tools and data its task needs, with the least permission they allow, and anything that moves money, changes data or acts on someone's account needs a person's confirmation.

**Why:** A model given broad powers will eventually use them wrongly, whether by mistake or because someone tricked it.

**Ask:** Does the AI in this change have more access than its task needs, or act on anything important without confirmation?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | `ai-features` | [OWASP Top 10 for LLM Applications 2025, LLM06, Excessive Agency](https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM06_ExcessiveAgency.md) |

## AI-06 · Instructions to the model hold no secrets

The instructions given to a model hold no secrets, credentials or rules that only work if nobody sees them.

**Why:** People can get a model to repeat its instructions, so anything in them should be safe to read.

**Ask:** Do the model's instructions in this change hold anything that would matter if someone read them?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | Medium | `ai-features` | [OWASP Top 10 for LLM Applications 2025, LLM07, System Prompt Leakage](https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM07_SystemPromptLeakage.md) |

## AI-07 · AI calls have limits

Every call to an AI service has a timeout and a size limit, and each person has a spending or usage limit.

**Why:** AI calls are slow and paid per use, so one runaway loop or one abusive user can take the feature down or run up a large bill.

**Ask:** Does every AI call in this change have a timeout, a size limit and a per-person limit?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | `ai-features` | [OWASP Top 10 for LLM Applications 2025, LLM10, Unbounded Consumption](https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM10_UnboundedConsumption.md) |

## AI-08 · An AI feature is tested on fixed examples before every change

An AI feature has a set of example inputs with the behaviour expected for each, and they're run before every change to its instructions or its model.

**Why:** A small change to a prompt or a model version can quietly break answers that used to be right.

**Ask:** Were the AI feature's examples run for this change to its instructions or model?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | `ai-features` | – |
