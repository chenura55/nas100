/* NasLog — SweetAlert2 helpers */
const SW = {
  background: "#1a1a1c",
  color: "#f4f4f6",
  buttonsStyling: false,
  reverseButtons: true,
  heightAuto: false,
  scrollbarPadding: false,
};

const noSwal = () => {
  alert("The popup library could not load. Check your internet connection and refresh the page.");
};

const pop = (extra = "") => ({
  ...SW,
  position: isMob() ? "bottom" : "center",
  allowOutsideClick: false,
  focusConfirm: false,
  showCancelButton: true,
  showCloseButton: true,
  cancelButtonText: "Cancel",
  customClass: {
    popup: "nl-pop " + extra,
    confirmButton: "nl-ok",
    cancelButton: "nl-cancel",
    htmlContainer: "nl-html",
    closeButton: "nl-close",
  },
  showClass: isMob()
    ? { popup: "nl-up", backdrop: "swal2-backdrop-show" }
    : { popup: "swal2-show", backdrop: "swal2-backdrop-show" },
  hideClass: isMob()
    ? { popup: "nl-down", backdrop: "swal2-backdrop-hide" }
    : { popup: "swal2-hide", backdrop: "swal2-backdrop-hide" },
});

const ask = async (title, text, btn = "Delete") =>
  window.Swal
    ? (
        await Swal.fire({
          ...SW,
          title,
          text,
          icon: "warning",
          iconColor: "#f0627a",
          showCancelButton: true,
          confirmButtonText: btn,
          cancelButtonText: "Cancel",
          focusCancel: true,
          customClass: { popup: "nl-pop", confirmButton: "nl-ok danger", cancelButton: "nl-cancel" },
        })
      ).isConfirmed
    : confirm(title);

const toast = (title, icon = "success") =>
  window.Swal &&
  Swal.fire({
    toast: true,
    position: isMob() ? "top" : "top-end",
    icon,
    iconColor: icon === "success" ? "#c6f432" : "#f0627a",
    title,
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
    background: "#242427",
    color: "#f4f4f6",
    customClass: { popup: "nl-toast" },
  });
