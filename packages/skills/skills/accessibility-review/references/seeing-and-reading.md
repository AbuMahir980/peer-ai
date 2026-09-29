# Seeing, reading and understanding

DES-07, DES-13 to DES-16, FE-08.

## DES-07: never colour alone

- **Look at:** each `indicator`: a status, a badge, an error, a required field.
- **Pass:** the meaning is also in words, or in an icon with a name.
- **Fail:** a status shown only as a coloured dot or background; an error shown only by turning a border red.

## DES-13: contrast in every theme

- **Look at:** each text and control colour against its background, from the tokens or the styles, in every theme.
- **Work it out:** the contrast ratio from the two colours' relative luminance. Normal text needs 4.5 to 1; large text, icons and control borders need 3 to 1.
- **Pass:** each pair, with its ratio.
- **Fail:** each pair below its threshold, with its ratio, such as "hint text #c4c4c4 on white is 1.7 to 1, under 4.5".

## DES-14: text grows with the person's setting

- **Look at:** how text sizes are set.
- **Pass:** sizes that scale, such as `rem` on the web, or text that follows the system size in a phone app.
- **Fail:** fixed pixel sizes that block scaling, or a setting that turns scaling off, such as `allowFontScaling={false}`.

## DES-15: touch targets are large enough

- **Look at:** each control's size, including its padding.
- **Pass:** at least the platform profile's size, from `standards_for_file`. WCAG 2.2's minimum is 24 by 24 CSS pixels; phone platforms ask for about 44 by 44 points.
- **Fail:** a small icon button with no padding around it.

## DES-16: motion respects the setting

- **Look at:** each animation that isn't essential.
- **Pass:** it stops or softens under the reduced-motion setting, such as `prefers-reduced-motion`.
- **Not applicable:** no animation in scope. Say so.

## FE-08: error messages say what to do

- **Look at:** each `message` shown when something fails.
- **Pass:** what went wrong, and what the person can do, such as "We couldn't save your booking. Check your connection and try again."
- **Fail:** "Something went wrong", a raw error code, or nothing at all.
