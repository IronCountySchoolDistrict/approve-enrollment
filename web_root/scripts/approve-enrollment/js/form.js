/**
 * Generate the approve form fields from the approve-fields.json field definition file.
 */

define(["Handlebars", "reg/handlebars-helpers"], function(Handlebars, handlebarsHelpers) {
    "use strict";
    return {
        populateForm: function() {
            loadingDialogInstance.open();
            handlebarsHelpers.bindHelpers();
            var self = this;
            var requests = [];
            requests.push(this.getEnrollment());
            requests.push(self.getFieldMap());
            requests.push(self.getStudentIds());
            requests.push(self.insertTemplates());
            $j.when.apply($j, requests).then(function(enrollment, fieldMap, studentIds) {
                var studentIds = studentIds[0];
                self.getCoreStudentData(studentIds).then(function(studentCoreData) {
                    var gpvObject = self.formToGpvObject(enrollment[0].form.elements, fieldMap[0]);

                    // Add coreStudentData fields to gpvObject
                    gpvObject.unshift({
                        name: "first-name",
                        value: studentCoreData.first_name
                    });
                    gpvObject.unshift({
                        name: "middle-name",
                        value: studentCoreData.middle_name
                    });
                    gpvObject.unshift({
                        name: "last-name",
                        value: studentCoreData.last_name
                    });
                    gpvObject.unshift({
                        name: "gender",
                        value: studentCoreData.gender
                    });
                    gpvObject.unshift({
                        name: "dob",
                        value: new Date(studentCoreData.dob).toLocaleDateString()
                    });
                    var gpvParam = $j.param(gpvObject);
                    $j.getJSON("/admin/approve-enrollment/json/approve-fields.json?" + gpvParam, function(fields) {
                        $j.each(fields, function(index, field) {

                            // Is the field an address field? 
                            if (field.hasOwnProperty('addressFieldValue')) {
                                // Make sure all four fields for this address are not blank 
                                if (field.addressFieldValue === "" ||
                                    field.cityFieldValue === "" ||
                                    field.stateFieldValue === "" ||
                                    field.zipFieldValue === "") {

                                    // Blank out all address fields if all fields are not present.
                                    field.addressFieldValue = "";
                                    field.cityFieldValue = "";
                                    field.stateFieldValue = "";
                                    field.zipFieldValue = "";

                                    // Create a variable that will be used to hide the comma in the address template.
                                    field.hideComma = true;
                                }
                            }
                            var templateId = field.template;
                            var templateStr = $j('#' + templateId).html();
                            var template = Handlebars.compile(templateStr);
                            var compiledTemplate = template(field);
                            $j('#approve-table > tbody').append(compiledTemplate);
                        });
        
                        loadingDialogInstance.forceClose();
                    });
                });
			});
        },

        getCoreStudentData: function(studentIds) {
            return $j.getJSON('/admin/approve-enrollment/json/enrollment.json.html?action=get.student.fields&student_id=' + studentIds.id);
        },

        insertTemplates: function() {
            $j.get('/scripts/approve-enrollment/templates/form-element-row.html', function(formElementRow) {
                $j('body').append(formElementRow);
            });
        },

        getFormObjectElemFromFieldMap: function (formObject, fieldMapElem) {
            var criteria = [];

            $j.each(fieldMapElem, function(propertyName, valueOfProperty) {
                if (propertyName !== "gpv_field_name") {
                    if(propertyName === "fb_title") {
                        criteria.push({
                            title: valueOfProperty
                        });
                    } else if (propertyName === "fb_description") {
                        criteria.push({
                            description: valueOfProperty
                        });
                    } else if (propertyName === "position") {
                        criteria.push({
                            position: valueOfProperty
                        });
                    }
                }
            });

            // Return the first match
            return $j.grep(formObject, function(formObjectElem, index) {
                var formObjectElemMatchFound = true;
                $j.each(criteria, function(index, criteriaElem) {
                    var keyName = Object.keys(criteriaElem)[0];
                    formObjectElemMatchFound = formObjectElemMatchFound && (formObjectElem[keyName] === criteriaElem[keyName]);
                });
                return formObjectElemMatchFound;
            })[0];
        },

        formToGpvObject: function (formObject, fieldMap) {
            var self = this;
            var gpvObjects = [];
            $j.each(fieldMap, function(index, element) {
                var formObjectMatchingElem = self.getFormObjectElemFromFieldMap(formObject, element);
                try {
                    var gpvObject = {
                        name: element.gpv_field_name,
                        value: formObjectMatchingElem.response
                    };   
                    gpvObjects.push(gpvObject);
                } catch (e) {
                    if (formObjectMatchingElem.length === 0) {
                        console.log("formObjectMatchingElem did not return any matches.");
                    }
                }
                
            }); 
            return gpvObjects; 
        },

        getFieldMap: function() {
            return $j.getJSON("/scripts/approve-enrollment/json/fb-field-map.json");
        },

        getEnrollment: function() {
            var requests = [],
                self = this;

            requests.push(this.getStudentIds());
            requests.push(this.getFormId());
            return $j.when.apply($j, requests).then(function(studentIds, formId) {
                return self.getEnrollmentData(studentIds[0], formId[0]);
            });
        },

        getStudentIds: function() {
            return $j.getJSON("/admin/approve-enrollment/json/enrollment.json.html?action=get.studentids");
        },

        getFormId: function() {
            return $j.getJSON("/admin/approve-enrollment/json/enrollment.json.html?action=get.form.id");
        },

        getEnrollmentData: function(studentIds, formId) {
            return $j.getJSON("/admin/formbuilder/scripts/json/form.json?subjectid=" + studentIds.id + "&frn=" + studentIds.frn + "&formid=" + formId.id + "&formtype=P&action=get");
        }
    };
});