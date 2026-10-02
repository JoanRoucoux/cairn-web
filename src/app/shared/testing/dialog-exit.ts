export const slowDialogExit = (milliseconds = 200): HTMLDialogElement => {
  const dialog = document.querySelector('dialog') as HTMLDialogElement;

  dialog.style.transitionDuration = `${milliseconds}ms`;

  return dialog;
};
