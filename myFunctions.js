jQuery(document).ready(function() {
    var mainContent = jQuery("#page");
    mainContent.css({ "opacity": 0 }).animate({ "opacity": 1 }, 500);

    var fleetTable = jQuery("#fleet");
    if (fleetTable.length > 0) {
        initializeCarRentalSystem();
    }
});

function initializeCarRentalSystem() {
    var reservationForm = jQuery("#reserve");
    reservationForm.attr("novalidate", "novalidate");

    var detailCheckboxes = jQuery(".chkInfo");
    detailCheckboxes.on("change", function() {
        var targetRow = jQuery(this).closest("tr");
        var detailsBox = targetRow.find(".more");
        if (this.checked === true) {
            detailsBox.slideDown(250);
        } else {
            detailsBox.slideUp(250);
        }
    });

    var selectionCheckboxes = jQuery(".chkPick");
    selectionCheckboxes.on("change", function() {
        var selectedCount = selectionCheckboxes.filter(":checked").length;
        var counterElement = jQuery("#pickCount");
        if (selectedCount > 0) {
            counterElement.text("(" + selectedCount + " selected)");
        } else {
            counterElement.text("");
        }
    });

    var continueButton = jQuery("#goBtn");
    continueButton.on("click", function() {
        var selectedCars = selectionCheckboxes.filter(":checked");
        if (selectedCars.length === 0) {
            alert("Please select at least one car.");
            return;
        }
        reservationForm.slideDown(350);
        jQuery("html, body").animate({
            "scrollTop": reservationForm.offset().top - 20
        }, 450);
    });

    reservationForm.on("submit", function(event) {
        event.preventDefault();
        if (validateFormInputs() === true) {
            generateReservationSummary();
        }
    });
}

function parseDateString(dateString) {
    var dateParts = dateString.split("-");
    if (dateParts.length !== 3) {
        return null;
    }
    if (dateParts[0].length !== 4 || dateParts[1].length !== 2 || dateParts[2].length !== 2) {
        return null;
    }

    var yearValue = parseInt(dateParts[0], 10);
    var monthValue = parseInt(dateParts[1], 10);
    var dayValue = parseInt(dateParts[2], 10);

    if (isNaN(yearValue) || isNaN(monthValue) || isNaN(dayValue)) {
        return null;
    }

    var dateObject = new Date(Date.UTC(yearValue, monthValue - 1, dayValue));
    var isValidDate = dateObject.getUTCFullYear() === yearValue &&
                     dateObject.getUTCMonth() === monthValue - 1 &&
                     dateObject.getUTCDate() === dayValue;

    return isValidDate ? dateObject : null;
}

var validationRules = {
    fullName: function(inputValue) {
        if (inputValue === "") {
            return "";
        }
        var nameWords = inputValue.split(" ");
        for (var i = 0; i < nameWords.length; i++) {
            var isValidWord = /^[\u0621-\u064A]+$/.test(nameWords[i]);
            if (isValidWord === false) {
                return "The name must contain only Arabic characters.";
            }
        }
        return "";
    },
    nid: function(inputValue) {
        if (inputValue === "") {
            return "Required field.";
        }
        if (inputValue.length !== 11) {
            return "Exactly 11 digits required.";
        }
        if (isNaN(inputValue) === true) {
            return "Exactly 11 digits required.";
        }
        if (inputValue.indexOf(".") >= 0 || inputValue.indexOf("+") >= 0 || inputValue.indexOf("-") >= 0) {
            return "Exactly 11 digits required.";
        }
        var governorateCode = parseInt(inputValue.substring(0, 2), 10);
        if (governorateCode < 1 || governorateCode > 14) {
            return "First two digits (governorate code) must be from 01 to 14.";
        }
        return "";
    },
    from: function(inputValue) {
        if (inputValue === "") {
            return "Required field.";
        }
        var parsedDate = parseDateString(inputValue);
        if (parsedDate === null) {
            return "Required format yyyy-mm-dd with valid date.";
        }
        return "";
    },
    to: function(inputValue, allValues) {
        if (inputValue === "") {
            return "Required field.";
        }
        var endDate = parseDateString(inputValue);
        if (endDate === null) {
            return "Required format yyyy-mm-dd with valid date.";
        }
        var startDate = parseDateString(allValues.from);
        if (startDate !== null && endDate.getTime() <= startDate.getTime()) {
            return "Must be after start date.";
        }
        return "";
    },
    phone: function(inputValue) {
        if (inputValue === "") {
            return "";
        }
        var normalizedNumber = inputValue.replace(/^(\+963|00963)/, "0");
        var isSyriatelNumber = /^09(3|8|9)\d{7}$/.test(normalizedNumber);
        var isMTNNumber = /^09(4|5|6)\d{7}$/.test(normalizedNumber);
        if (isSyriatelNumber === false && isMTNNumber === false) {
            return "Number must be Syriatel (093/098/099) or MTN (094/095/096).";
        }
        return "";
    },
    mail: function(inputValue) {
        if (inputValue === "") {
            return "";
        }
        var emailPattern = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
        if (emailPattern.test(inputValue) === false) {
            return "Invalid email format.";
        }
        return "";
    }
};

function validateFormInputs() {
    var inputValues = {};
    var formIsValid = true;

    jQuery.each(validationRules, function(fieldId) {
        var selector = "#" + fieldId;
        inputValues[fieldId] = cleanInputValue(selector);
    });

    jQuery.each(validationRules, function(fieldId, validationFunction) {
        var errorMessage = validationFunction(inputValues[fieldId], inputValues);
        var fieldElement = jQuery("#" + fieldId);

        if (errorMessage !== "") {
            fieldElement.addClass("invalid");
            fieldElement.siblings(".msg").text(errorMessage);
            formIsValid = false;
        } else {
            fieldElement.removeClass("invalid");
            fieldElement.siblings(".msg").text("");
        }
    });

    return formIsValid;
}

function cleanInputValue(selector) {
    var rawValue = jQuery(selector).val();
    if (rawValue === null || rawValue === undefined) {
        return "";
    }
    return String(rawValue).replace(/^\s+|\s+$/g, "");
}

function generateReservationSummary() {
    var startDate = parseDateString(cleanInputValue("#from"));
    var endDate = parseDateString(cleanInputValue("#to"));
    var rentalDays = Math.round((endDate - startDate) / 86400000);

    var tableRows = [];
    var totalPrice = 0;

    var selectedCheckboxes = jQuery(".chkPick:checked").get();
    for (var i = 0; i < selectedCheckboxes.length; i++) {
        var checkbox = jQuery(selectedCheckboxes[i]);
        var rowElement = checkbox.closest("tr");
        var carPrice = Number(rowElement.find(".price").text());
        var carTotal = carPrice * rentalDays;
        totalPrice += carTotal;

        var carModel = rowElement.find(".model").text();
        tableRows.push("<tr><td>" + carModel + "</td><td>" + rentalDays + " days</td><td>" + carTotal.toLocaleString("en-US") + "</td></tr>");
    }

    var discountAmount = 0;
    if (rentalDays > 10) {
        discountAmount = totalPrice * 0.05;
    }

    var summaryHTML = "<h2>Request Received</h2>";
    var customerName = cleanInputValue("#fullName");
    if (customerName !== "") {
        summaryHTML += "<p>Hello " + customerName + ", here is your reservation summary:</p>";
    }

    summaryHTML += "<table><tr><th>Car</th><th>Rental Period</th><th>Cost (SYP)</th></tr>";
    summaryHTML += tableRows.join("");
    summaryHTML += "</table>";

    summaryHTML += "<p>Total before discount: <b>" + totalPrice.toLocaleString("en-US") + "</b> SYP</p>";

    var discountText = discountAmount > 0 ? "5% for more than 10 days" : "None";
    summaryHTML += "<p>Discount (" + discountText + "): <b>" + discountAmount.toLocaleString("en-US") + "</b> SYP</p>";

    var finalAmount = totalPrice - discountAmount;
    summaryHTML += "<p>Final amount: <b>" + finalAmount.toLocaleString("en-US") + "</b> SYP</p>";

    var summaryElement = jQuery("#summary");
    summaryElement.html(summaryHTML).hide().slideDown(400);

    jQuery("html, body").animate({
        "scrollTop": summaryElement.offset().top - 20
    }, 450);
}
