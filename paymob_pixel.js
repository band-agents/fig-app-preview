// FIG, browser build: Paymob's card form (Pixel) inside the checkout, in a sheet over the page.
//
// The app draws on a canvas, so the form lives in plain DOM above it, called from Dart through
// window.figPaymobPixel.open (lib/core/browser_web.dart). Pixel is 2 MB, so it is fetched only when
// a customer actually pays by card, and from a pinned version, so a Paymob release cannot change
// the checkout underneath us.
//
// Nothing here decides whether an order is paid. When the card is charged (3-D Secure included),
// Pixel sends the browser to the payment's return address, which is the app's own "confirming your
// payment" screen; the backend asks Paymob there, exactly as it does after Paymob's hosted page.
// If Pixel cannot be loaded at all, onFailed hands the customer to that hosted page instead.
(function () {
  "use strict";

  var PIXEL = "https://cdn.jsdelivr.net/npm/paymob-pixel@1.2.7/main.js";
  var FONT =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Arabic", Tahoma, sans-serif';
  var INK = "#0F0F10";
  var RED = "#EB3638";

  var loading = null;

  /** Loads Pixel once; it registers itself as window.Pixel. */
  function load() {
    if (window.Pixel) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.type = "module";
      script.src = PIXEL;
      script.onerror = function () {
        loading = null;
        reject(new Error("Pixel could not be loaded"));
      };
      script.onload = function () {
        var tries = 0;
        (function wait() {
          if (window.Pixel) return resolve();
          if (++tries > 50) {
            loading = null;
            return reject(new Error("Pixel did not start"));
          }
          setTimeout(wait, 100);
        })();
      };
      document.head.appendChild(script);
    });
    return loading;
  }

  function el(tag, css, text) {
    var node = document.createElement(tag);
    if (css) node.style.cssText = css;
    if (text) node.textContent = text;
    return node;
  }

  /** FIG's colours on Paymob's form, and its Arabic in the app's Egyptian voice. */
  function style(rtl) {
    var s = {
      Font_Family: FONT,
      Font_Size_Label: "15",
      Font_Size_Input_Fields: "16",
      Font_Size_Payment_Button: "16",
      Font_Weight_Label: 600,
      Font_Weight_Input_Fields: 400,
      Font_Weight_Payment_Button: 700,
      Color_Container: "#FFFFFF",
      Color_Border_Input_Fields: "#D8D8DC",
      Color_Border_Payment_Button: RED,
      Radius_Border: "12",
      Color_Disabled: "#F4B4B5",
      Color_Error: "#C4262A",
      Color_Primary: RED,
      Color_Input_Fields: "#FFFFFF",
      Text_Color_For_Label: INK,
      Text_Color_For_Payment_Button: "#FFFFFF",
      Text_Color_For_Input_Fields: INK,
      Color_For_Text_Placeholder: "#8A8A90",
      Width_of_Container: "100%",
      Vertical_Padding: "8",
      Vertical_Spacing_between_components: "14",
      Container_Padding: "0",
    };
    if (!rtl) return s;
    s.Direction = "rtl";
    s.Label_Text = {
      cardLabel: "بيانات الكارت",
      savedCardsLabel: "الكروت المحفوظة",
      saveCardConsentLabel: "احفظ الكارت",
      cardEndingLabel: "آخره",
    };
    s.Placeholder_Text = {
      holderName: "الاسم على الكارت",
      cardNumber: "رقم الكارت",
      expiryDate: "شهر / سنة",
      securityCode: "CVV",
    };
    s.Error_Text = {
      cardNumber: { required: "اكتب رقم الكارت", invalid: "رقم الكارت مش صحيح" },
      expiryDate: { required: "اكتب تاريخ الانتهاء", invalid: "تاريخ الانتهاء مش صحيح" },
      securityCode: "اكتب الـ CVV",
      holderName: "اكتب الاسم اللي على الكارت",
    };
    s.Button_Text = {
      viewSavedCardsBtn: "الكروت المحفوظة",
      addNewCardBtn: "كارت جديد",
      payBtn: "ادفع",
    };
    s.Hint_Text = {
      saveCardConsentHint: "هنحفظ الكارت عشان تدفع بيه المرة الجاية.",
      cvvModalTitle: "الـ CVV",
      cvvVisaMastercardQuestion: "كارت فيزا أو ماستركارد؟",
      cvvVisaMastercardHint: "3 أرقام على ضهر الكارت.",
      cvvAmexQuestion: "كارت أمريكان إكسبريس؟",
      cvvAmexHint: "4 أرقام على وش الكارت، فوق الرقم.",
    };
    return s;
  }

  window.figPaymobPixel = {
    /**
     * Opens the card sheet. Options: publicKey, clientSecret, rtl, title, walletLabel, secureNote,
     * loadingText, closeLabel, and three callbacks: onClose (dismissed without paying), onWallet
     * (wants a mobile wallet, which Pixel does not offer) and onFailed (Pixel would not load).
     */
    open: function (o) {
      var root = el(
        "div",
        "position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;" +
          "justify-content:center;background:rgba(15,15,16,.45);font-family:" + FONT
      );
      root.setAttribute("role", "dialog");
      root.setAttribute("aria-modal", "true");
      root.setAttribute("aria-label", o.title);
      root.dir = o.rtl ? "rtl" : "ltr";

      var sheet = el(
        "div",
        "width:100%;max-width:520px;max-height:92vh;overflow:auto;background:#fff;" +
          "border-radius:20px 20px 0 0;padding:20px 20px 24px;box-sizing:border-box;" +
          "box-shadow:0 -8px 30px rgba(0,0,0,.18)"
      );
      var head = el(
        "div",
        "display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"
      );
      var title = el("div", "font-size:19px;font-weight:700;color:" + INK, o.title);
      var close = el(
        "button",
        "border:0;background:#F2F2F3;width:36px;height:36px;border-radius:18px;font-size:20px;" +
          "line-height:36px;cursor:pointer;color:" + INK,
        "×"
      );
      close.setAttribute("aria-label", o.closeLabel);
      head.appendChild(title);
      head.appendChild(close);

      var mount = el("div", "min-height:120px");
      mount.id = "fig-paymob-pixel-" + Date.now();
      var waiting = el(
        "div",
        "padding:36px 0;text-align:center;color:#55555A;font-size:14px",
        o.loadingText
      );
      mount.appendChild(waiting);

      var wallet = el(
        "button",
        "margin-top:14px;width:100%;height:48px;border-radius:24px;border:1.5px solid " + INK +
          ";background:#fff;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;color:" +
          INK,
        o.walletLabel
      );
      var note = el(
        "div",
        "margin-top:12px;font-size:12px;line-height:1.5;color:#77777C;text-align:center",
        o.secureNote
      );

      sheet.appendChild(head);
      sheet.appendChild(mount);
      sheet.appendChild(wallet);
      sheet.appendChild(note);
      root.appendChild(sheet);
      document.body.appendChild(root);

      var done = false;
      function onKey(e) {
        if (e.key === "Escape") cancel();
      }
      function remove() {
        document.removeEventListener("keydown", onKey);
        if (root.parentNode) root.parentNode.removeChild(root);
      }
      function cancel() {
        if (done) return;
        done = true;
        remove();
        o.onClose();
      }
      close.onclick = cancel;
      root.onclick = function (e) {
        if (e.target === root) cancel();
      };
      document.addEventListener("keydown", onKey);
      // The page is left for Paymob's hosted page, so the sheet stays up while it navigates.
      wallet.onclick = function () {
        if (done) return;
        done = true;
        o.onWallet();
      };

      load()
        .then(function () {
          if (done) return;
          mount.removeChild(waiting);
          new window.Pixel({
            publicKey: o.publicKey,
            clientSecret: o.clientSecret,
            // Google Pay and Apple Pay need their own merchant set-up with Paymob first.
            paymentMethods: ["card"],
            elementId: mount.id,
            // Saving cards is not confirmed for FIG's account yet.
            showSaveCard: false,
            forceSaveCard: false,
            customStyle: style(!!o.rtl),
          });
        })
        .catch(function () {
          if (done) return;
          done = true;
          o.onFailed();
        });
    },
  };
})();
