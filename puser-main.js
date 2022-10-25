/* global soyut, jQuery, Vue, async, io, getAppInstance, getActivityInstanceAsync */
/* @flow */
console.log("[puser] I'm running !_--------------_!");

soyut.penilaianUser.komponen = {};
soyut.penilaianUser.logName = "[puser] ";

/**
 * Halaman Penilaian 'Semua Posko'
 */
(function (soyut, spu, api, $) {
  var logName = "[puser][produk] ";

  spu.komponen = $.extend(spu.komponen, {
    totalNilai: {
      name: "total-nilai",
      template: $(".total-nilai-template").html(),
      props: ["group"],
      created: function () {
        if (spu.poskoData.nilaiNilaiKogas[this.group.id]) {
          // console.log(logName, '[puser] there is NilaiKogas for ', this.group.name, spu.poskoData.nilaiNilaiKogas[this.group.id]);
        } else {
          // console.log(logName, '[puser] No NilaiKogas for ' + this.group.name + ', creating it ... ', this.group);
          spu.poskoData.createNilaiKogas(this.group);
        }
      },
      computed: {
        nilaiData: function () {
          return this.group.nilaiData;
        },
        nilaiKogas: function () {
          return spu.poskoData.nilaiNilaiKogas[this.group.id];
        },
        nilai: function () {
          return this.nilaiKogas.nilai;
        },
        hasil: function () {
          return this.nilaiKogas.getResult();
        },
      },
      watch: {
        nilaiData: function () {
          spu.poskoData.createNilaiKogas(this.group);
        },
      },
    },
    nilai: {
      name: "nilai",
      template: $(".nilai-template").html(),
      props: ["roleGroup", "checklist", "nilai-data"],
      data: function () {
        return {
          nilai: this.filterNilaiData(this.nilaiData),
        };
      },
      watch: {
        nilaiData: function (newVal) {
          this.nilai = this.filterNilaiData(newVal);
        },
      },
      computed: {
        mappedNilai: function () {
          if (this.nilai) {
            return this.mapDataToListByKey(
              this.nilai.aspeks,
              this.nilai.lembarNilai.aspects,
              "aspekId",
              "id"
            );
          }
        },
        totalWeight: function () {
          if (this.nilai) {
            return this.sumWeights(this.mappedNilai);
          }
        },
        hasil: function () {
          var nilaiTotal = 0;
          this.mappedNilai.forEach(function (field) {
            if (field.max === 0 || field.max === "") {
              field.max = 1;
              field.grade = 0;
            }
            nilaiTotal +=
              (parseFloat(field.weight) / parseFloat(field.max)) * field.grade;
          });

          return ((nilaiTotal / this.totalWeight) * 100).toFixed(2);
        },
        nilaiKualitatif: function () {
          var buttonClass = "";
          switch (true) {
            case this.hasil > 100:
            case this.hasil < 0:
              buttonClass = "";
              break;
            case this.hasil >= 94.9:
              buttonClass = "btn-success";
              break;
            case this.hasil >= 84.9:
              buttonClass = "btn-success";
              break;
            case this.hasil >= 79.9:
              buttonClass = "btn-warning";
              break;
            case this.hasil >= 64.9:
              buttonClass = "btn-warning";
              break;
            case this.hasil > 0:
              buttonClass = "btn-danger";
              break;
            default:
              buttonClass = "";
          }
          return buttonClass;
        },
      },
      methods: {
        filterNilaiData: function (nilaiData) {
          return nilaiData.filter(
            function (nilai) {
              if (nilai.hasOwnProperty("subyek")) {
                if (
                  nilai.subyek.refId === this.roleGroup.id &&
                  nilai.lembarNilaiId === this.checklist.penilaian
                ) {
                  return nilai;
                }
              }
            }.bind(this)
          )[0];
        },
        sumWeights: function (aspects) {
          return aspects.reduce(function (a, b) {
            if (a.weight === "") {
              a.weight = 0;
            }
            if (b.weight === "") {
              b.weight = 0;
            }
            return parseFloat(a.weight ? a.weight : a) + parseFloat(b.weight);
          });
        },
        mapDataToListByKey: function (data, list, keyData, keyList) {
          return data.reduce(function (a, b) {
            return a.map(function (item) {
              if (item[keyList] === b[keyData]) {
                item.grade = b.nilai;
                return item;
              } else {
                return item;
              }
            });
          }, list);
        },
        select: function (checklist, subyek, type) {
          this.$root.selectChecklist(checklist, subyek, type);
        },
      },
    },
    puserTable: {
      name: "puser-table",
      template: $(".puser-table-template").html(),
      props: ["data"],
    },
    lembarIsian: {
      name: "lembar-isian",
      template: $(".lembar-isian-template").html(),
      props: [
        "scenario-name",
        "checklist",
        "subyek",
        "role-groups-obj",
        "penilai",
        "category",
      ], // subyek can be a roleGroup or a user
      computed: {
        refId: function () {
          return this.subyek.refId;
        },
        roleGroup: function () {
          return this.roleGroupsObj[this.refId];
        },
      },
      methods: {
        save: function () {
          console.log(
            "simpaan",
            this.session,
            this.checklist,
            this.subyek,
            this.penilai,
            this.category
          );
        },
        close: function () {
          this.$emit("close");
        },
      },
    },
  });

  spu.komponen = $.extend(spu.komponen, {
    checklistRow: {
      template: $(".checklist-row-template").html(),
      props: ["checklist", "role-groups", "index", "nilai-data"],
      components: {
        nilai: spu.komponen.nilai,
      },
      methods: {
        filterNilaiData: function (roleGroup, nilaiData) {
          return nilaiData.filter(
            function (item) {
              if (
                item.hasOwnProperty("subyek") &&
                item.hasOwnProperty("lembarNilai")
              ) {
                if (
                  item.subyek.refId === roleGroup.id &&
                  item.lembarNilai.id === this.checklist.penilaian
                ) {
                  return item;
                }
              }
            }.bind(this)
          )[0];
        },
      },
    },
  });

  spu.komponen = $.extend(spu.komponen, {
    produk: {
      template: $(".nilai-produk-template").html(),
      props: ["role-groups", "posko-checklists", "mapped-group", "nilai-data"],
      name: "produk",
      components: {
        "total-nilai": spu.komponen.totalNilai,
        "checklist-row": spu.komponen.checklistRow,
      },
    },
  });
})(soyut, soyut.penilaianUser, soyut.penilaianUser.api, jQuery);

/**
 * Halaman Penilaian 'Aktivitas Pelaku'
 */
(function (soyut, spu, api, $) {
  var logName = "[puser][aktivitas] ";

  spu.komponen = $.extend(spu.komponen, {
    nilaiPeroranganItem: {
      template: $(".nilai-perorangan-item-template").html(),
      props: ["pelaku", "nilai-kogas", "pelaku-terbaik"],
      name: "pelaku",
      computed: {
        nilaiAktivitas: function () {
          return this.pelaku.getNilaiAktivitas();
        },
        nilaiProduk: function () {
          return this.nilaiKogas.getResult();
        },
        nilaiAkhir: function () {
          return (this.nilaiAktivitas + this.nilaiProduk) / 2;
        },
        // todo: belum berjalan dengan baik
        isTerbaik: function () {
          return (
            this.pelaku.role.id === this.pelakuTerbaik.roleId ||
            this.nilaiAkhir === this.pelakuTerbaik.nilaiAkhir
          );
        },
      },
      created: function () {
        this.$emit("nilai-akhir", {
          roleId: this.pelaku.role.id,
          userName: this.pelaku.user.name,
          nilaiAkhir: this.nilaiAkhir,
        });
      },
    },
  });

  var app = getAppInstance();

  spu.komponen = $.extend(spu.komponen, {
    aktivitasPelaku: {
      template: $(".aktivitas-pelaku-template").html(),
      data: function () {
        return {
          paraPelaku: spu.aktivitasData.paraPelaku, // todo: kalau dirubah ke Object ga ke render
          groupedPelaku: spu.aktivitasData.groupedPelaku,
          dayInfo: "",
          hoveredDay: "",
          trainingDays: spu.aktivitasData.trainingDays,
        };
      },
      mounted: function () {
        console.log("TEST INIT");
        // getNilaiNilaiAktivitas(_sessionId, spu.aktivitasData.lembarNilai.penilaian, distributeSavedNilaiIntoPelaku);
        spu.getNilaiNilaiAktivitas(
          soyut.Session.id,
          spu.aktivitasData.lembarNilai.penilaian,
          spu.distributeSavedNilaiIntoPelaku,
          spu.aktivitasData.paraPelaku
        );
      },
      watch: {
        trainingDays: function (newVal) {
          spu.aktivitasData.trainingDays = newVal;
          console.log(
            logName,
            "trainingDays:",
            spu.aktivitasData.trainingDays.length
          );
        },
      },
      methods: {
        addDay: function () {
          spu.aktivitasData.trainingDays++;
          this.trainingDays = spu.aktivitasData.trainingDays;
        },
        setSelectedAktivitas: function (kogas, day) {
          if (
            kogas === spu.aktivitasData.kogas &&
            day === spu.aktivitasData.day
          ) {
            console.log(
              logName,
              "you are selecting same detail",
              kogas.name,
              "day: ",
              day
            );
            return;
          }
          spu.aktivitasData.kogas = kogas;
          spu.aktivitasData.day = day;
          console.log(
            logName,
            "success setting selected aktivitas",
            spu.aktivitasData
          );
        },
        openDetail: function (kogas, day) {
          this.setSelectedAktivitas(kogas, day);

          if (!spu.aktivitasData.detailOpen) {
            console.log(
              logName,
              "you're opening",
              kogas.name,
              "hari ke: ",
              day
            );
            var activitylistener = getActivityInstanceAsync();
            activitylistener.then(
              function (activity) {
                var obj = {
                  kogas: kogas,
                  day: day,
                  trainingDays: this.trainingDays,
                };
                app.launchExternalActivity(
                  "soyut.module.app.aktivitasPelaku.detail",
                  obj,
                  app,
                  function (activityInstance) {
                    spu.aktivitasData.detailOpen = true;
                    activityInstance.on("onClose", this.handleDetailClosed);
                  }.bind(this)
                );
              }.bind(this)
            );
          }
        },
        handleDetailClosed: function (data) {
          console.log(logName, "detail closed", data);
          spu.aktivitasData.detailOpen = false;
        },
        handleDayHover: function (kogas, day) {
          this.dayInfo = kogas.name + " hari ke: " + day;
          this.hoveredDay = kogas.id + "_" + day;
        },
        determineSelectedDay: function (kogas, day) {
          if (kogas.id + "_" + day === this.hoveredDay) {
            return "warning";
          }
        },
      },
    },
  });
})(soyut, soyut.penilaianUser, soyut.penilaianUser.api, jQuery);

/**
 * Halaman Penilaian 'nilai Perorangan'
 */
(function (soyut, spu, api, $) {
  var logName = "[puser][nilai-perorangan] ";

  spu.komponen = $.extend(spu.komponen, {
    nilaiPerorangan: {
      template: $(".nilai-perorangan-template").html(),
      name: "nilai-perorangan",
      data: function () {
        return {
          paraPelaku: spu.aktivitasData.paraPelaku,
          excludedGroupId: "58dc6d156f000f6e20923fd0", // todo: remove from penilaian manager, 'DEV' rolegroup
          nilaiNilaiKogas: spu.poskoData.nilaiNilaiKogas, // already calculated by halaman nilaiPosko
          nilaiNilaiAkhir: [],
        };
      },
      created: function () {
        this.resetDataTerbaik();
      },
      computed: {
        pelakuTerbaik: function () {
          return this.nilaiNilaiAkhir.reduce(
            function (a, b) {
              if (b.nilaiAkhir >= a.nilaiAkhir) {
                return b;
              } else {
                return a;
              }
            },
            {
              nilaiAkhir: 0,
            }
          );
        },
      },
      components: {
        pelaku: spu.komponen.nilaiPeroranganItem,
      },
      methods: {
        resetDataTerbaik: function () {
          this.nilaiNilaiAkhir = [];
        },
        filterPelaku: function (Pelaku) {
          return (
            Pelaku.role.roleGroup !== this.excludedGroupId &&
            Pelaku.user.name &&
            Pelaku.user.name !== "ReqlNonExistenceError"
          );
        },
        /**
         * menyimpan nilai akhir yang dihitung di child,
         * menentukan yang tertinggi
         */
        storeNilaiAkhirCalculation: function (data) {
          this.nilaiNilaiAkhir.push(data);
        },
      },
    },
  });
})(soyut, soyut.penilaianUser, soyut.penilaianUser.api, jQuery);

/**
 * Init Aktivitas Pelaku
 */
(function (soyut, spu, api, $, Vue) {
  var logName = "[puser][init][aktivitas] ";

  Vue.filter("toFixed", function (number) {
    if (!isNaN(number) && number.constructor === Number) {
      return number.toFixed(2);
    } else {
      return 0;
    }
  });
  Vue.filter("toUpperCase", function (str) {
    return str.toUpperCase();
  });

  // use '_' is local, '__' is double local deep
  // not using '_' used by others
  var _sessionId = soyut.Session.id,
    _scenarioId = soyut.Session.scenario.id,
    _groups = [],
    _roles = [],
    _dataContainsUserId = [],
    _userData = [],
    paraPelaku = [],
    groupedPelaku = {};

  function createParaPelaku(roles, paraPelaku, callback, typeArr) {
    var initialNilaiData = {
      lembarNilaiId: spu.aktivitasData.lembarNilai.penilaian, // todo: apakah pakai data .penilaian atau .id
      penilaiId: soyut.Session.role.id,
      sessionId: soyut.Session.id,
    };
    for (var i = 0, y = roles.length; i < y; i++) {
      if (!typeArr) {
        if (paraPelaku.constructor !== Object) {
          paraPelaku = {};
        }
        paraPelaku[roles[i].id] = {};
        paraPelaku[roles[i].id] = new spu.Pelaku(
          {
            role: roles[i],
          },
          initialNilaiData
        );
      } else {
        paraPelaku.push(
          new spu.Pelaku(
            {
              role: roles[i],
            },
            initialNilaiData
          )
        );
      }
    }
    callback(paraPelaku);
  }

  function addPelaku(callback) {
    async.each(
      spu.aktivitasData.paraPelaku,
      function (pelaku, cb) {
        // console.log(logName, 'Kogas', this.groupedPelaku[pelaku.role.roleGroup].name, 'add pelaku', pelaku);
        spu.aktivitasData.groupedPelaku[pelaku.role.roleGroup].addPelaku(
          pelaku
        );
        cb(null, pelaku);
      }.bind(this),
      function (err) {
        console.log(logName, err, "done grouping para pelaku");
        callback(null, spu.aktivitasData.groupedPelaku);
      }.bind(this)
    );
  }

  function distributeSavedNilaiIntoPelaku(nilaiNilai, paraPelaku) {
    function mapSingle(nilai, _paraPelaku) {
      if (nilai.day) {
        var theNilai =
          _paraPelaku[nilai.subyekId].nilaiAktivitas.day[nilai.day];
        theNilai.update(nilai);
      } else {
        console.log(
          logName,
          'tidak ada properti "day" dalam data nilai (nilai.day):',
          nilai.day
        );
      }
    }

    if (nilaiNilai.constructor === Array) {
      if (nilaiNilai.length > 0) {
        nilaiNilai.map(function (nilai) {
          mapSingle(nilai, paraPelaku);
        });
      }
    } else {
      // map single nilai
      mapSingle(nilaiNilai, paraPelaku);
    }
  }

  function getNilaiNilaiAktivitas(sessionId, lembarNilaiId, fn, paraPelaku) {
    var arr = [];
    for (var i = 0, y = spu.nilaiData.length; i < y; i++) {
      if (spu.nilaiData[i].lembarNilaiId === lembarNilaiId) {
        arr.push(spu.nilaiData[i]);
      }
    }
    fn(arr, paraPelaku);
  }

  function getAspeks(lembarNilaiId, callback) {
    spu.service.penilaian.Penilaian_AspectByPenilaian(
      {
        penilaian: lembarNilaiId,
        sort: "asc",
        field: "sort",
      },
      callback
    );
  }

  spu.getNilaiNilaiAktivitas = getNilaiNilaiAktivitas;
  spu.getAspeks = getAspeks;
  spu.distributeSavedNilaiIntoPelaku = distributeSavedNilaiIntoPelaku;
  spu.addPelaku = addPelaku;
  spu.createParaPelaku = createParaPelaku;

  /**
   * Init Data for Penilaian
   * purpose: get role/user data
   * result:
   * - paraPelaku - list of Pelaku Object [Penilai.js]
   * - groupedPelaku - grouped Pelaku Object by roleGroup inside Kogas Object [Kogas.js]
   */
  function initPenilaianAktivitas(callback) {
    console.log(logName, "init penilaian");
    async.series(
      {
        checklists: function (callback) {
          api.getChecklists(soyut.Session.scenario.id, function (
            err,
            checklists
          ) {
            console.log(checklists, soyut.Session.scenario.id)
            async.each(
              checklists,
              function (checklist, _callback) {
                spu.checklists.push(checklist);
                _callback();
              },
              function (err) {
                console.log(err);
                callback(null, checklists);
              }
            );
          });
        }.bind(this),
        penilaian: function (callback) {
          // code here to map code
          callback(null, "code here");
        }.bind(this),
        groups: function (callback) {
          api.getRoleGroups(_scenarioId, function (err, groups) {
            console.log(logName, err, groups);
            _groups = groups;
            // prepare groupedPelaku
            async.each(
              groups,
              function (group, cb) {
                spu.aktivitasData.groupedPelaku[group.id] = new spu.Kogas(
                  group
                );
                cb(null, spu.aktivitasData.groupedPelaku[group.id]);
              },
              function (err) {
                console.log(logName, "async groups, err: ", err);
                callback(null, _groups);
              }
            );
          });
        }.bind(this),
        roles: function (callback) {
          api.getPasisList(_scenarioId, function (err, list) {
            console.log(logName, err, list);
            _roles = list;
            callback(null, list);
          });
        },
        lembarNilai: function (callback) {
          console.log(spu.checklists)
          spu.aktivitasData.lembarNilai = spu.helper.filterArrayByKey(
            spu.checklists,
            "description",
            "Aktivitas Pelaku"
          )[0];
          callback(null, spu.aktivitasData.lembarNilai);
        },
        aspeks: function (callback) {
          
          getAspeks(spu.aktivitasData.lembarNilai.penilaian, function (
            err,
            res
          ) {
            spu.aktivitasData.aspeks = res;
            callback(null, res);
          });
        },
        paraPelaku: function (callback) {
          createParaPelaku(
            _roles,
            spu.aktivitasData.paraPelaku,
            function (list) {
              spu.aktivitasData.paraPelaku = list;
              callback(null, list);
            },
            false
          );
        },
        dataContainsUserId: function (callback) {
          var __theData = [];
          async.each(
            _roles,
            function (role, cb) {
              api.getUserId(_sessionId, role.id, function (err, data) {
                spu.aktivitasData.paraPelaku[data.role].userId = data.user;
                __theData.push(data);
                cb(err, data);
              });
            },
            function (err) {
              console.log(
                logName,
                err,
                "done sub-async each for dataContainsId"
              );
              _dataContainsUserId = __theData;
              callback(null, __theData);
            }
          );
        },
        userData: function (callback) {
          var __userData = [];
          async.each(
            _dataContainsUserId,
            function (data, cb) {
              api.getUserData(
                data.user,
                function (err, user) {
                  spu.aktivitasData.paraPelaku[data.role].user = user;
                  __userData.push(user);
                  cb(null, user);
                }.bind(this)
              );
            },
            function (err) {
              console.log(logName, err, "done sub-async each for userData");
              _userData = __userData;
              callback(null, __userData);
            }
          );
        },
        groupedPelaku: function (callback) {
          addPelaku(callback);
        },
      },
      function (err, results) {
        callback(err, results);
      }
    );
  }

  spu.initPenilaianAktivitas = initPenilaianAktivitas;
})(soyut, soyut.penilaianUser, soyut.penilaianUser.api, jQuery, Vue);

soyut.penilaianUser.instantiate = function (soyut, spu, api, $, Vue) {
  var logName = "[puser][root-view] ";

  soyut.penilaianUser.rootView = new Vue({
    el: ".puser-root",
    name: "penilaian-user",
    components: {
      produk: spu.komponen.produk,
      "aktivitas-pelaku": spu.komponen.aktivitasPelaku,
      "nilai-perorangan": spu.komponen.nilaiPerorangan,
      "lembar-isian": spu.komponen.lembarIsian,
    },
    data: {
      logo: "",
      sessionId: soyut.Session.id,
      scenarioName: soyut.Session.scenario.name,
      activityId: soyut.Session.activity.id,
      scenarioId: "",
      origin: "",
      mappedData: {},
      mainId: soyut.penilaianUser.mainId,

      // view state
      showSessionList: false,
      showSessionDetail: false,
      showNilaiList: false,
      showLembarNilai: false,
      showPenilaianPerorangan: false,
      loading: true,

      // saved data
      // minimalize request to server
      savedUserRole: {}, // obj keyed by sessionId
      savedRoleList: {}, // obj keyed by scenarioId
      savedRoleGroup: {}, // savedRoleGroup with roles in it // obj keyed by roleGroup.id

      // active itu yang dipilih
      activeSessionData: {},
      selectedRoleGroupId: "",
      selectedRoleGroup: {},
      roles: [],
      userIds: [],
      userData: [],
      userRole: [],

      // user nilai data
      selectedUser: {},

      // homepage
      activeTab: "Semua Posko",

      // lembar isian page
      session: spu.session,
      penilai: spu.penilai,

      selectedChecklist: {},
      subyek: {},
      category: "",

      // button refresh state
      needRefreshData: false,
      refreshing: false,

      // kunci jawaban
      openBook: false,
      openBookInstance: {},

      // todo: add to manager setting: excludedGroup
      excludedGroups: [{ name: "DEV" }, { name: "KOLAT" }],
    },
    computed: {
      roleGroups: function () {
        return spu.roleGroups;
      },
      filteredRoleGroups: function () {
        function getGroupName(group) {
          return group.name;
        }
        return _.differenceBy(
          this.roleGroups,
          this.excludedGroups,
          getGroupName
        );
      },
      rolegroupsObj: function () {
        return spu.roleGroupsObj;
      },
      nilaiData: function () {
        return spu.nilaiData;
      },
      checklists: function () {
        return spu.checklists;
      },
      pelakuChecklist: function () {
        return spu.helper.filterArrayByKey(
          this.checklists,
          "description",
          "Semua Pelaku"
        );
      },
      poskoChecklists: function () {
        return spu.helper.filterArrayByKey(
          this.checklists,
          "description",
          "Semua Posko"
        );
      },
      aktivitasChecklist: function () {
        return spu.helper.filterArrayByKey(
          this.checklists,
          "description",
          "Aktivitas Pelaku"
        )[0];
      },
      checkListUserBreadCrumbs: function () {
        if (this.selectedUser && this.selectedUser.userData) {
          return (
            this.selectedUser.position + " " + this.selectedUser.userData.name
          );
        } else if (this.selectedChecklist) {
          return "Posko";
        }
      },
      /**
       * Get all checklist category
       * to be render on roleGroup list tab
       * in DB the field named description
       */
      checklistCat: function () {
        var arr = this.checklists.map(function (checklist) {
          return checklist.description;
        });
        return this.removesDuplicates(arr);
      },
      poskoChecklistsObj: function () {
        return spu.helper.buildCollection(this.roleGroups, "id");
      },
      checklistsObj: function () {
        return spu.helper.buildCollection(spu.checklists, "id");
      },
      roleGroupsObj: function () {
        return spu.helper.buildCollection(this.roleGroups, "id");
      },
      mappedData: function () {
        for (var key in this.checklistsObj) {
          if (this.checklistsObj.hasOwnProperty(key)) {
            this.checklistsObj[key].groups = this.roleGroupsObj;
          }
        }
      },
      /**
       * Groups with their own nilais
       * @returns {Array|*|{}}
       */
      mappedGroup: function () {
        return this.initMappedGroup(this.filteredRoleGroups, this.nilaiData);
      },
    },
    created: function () {
      spu.socket = io("https://" + spu.origin);

      spu.socket.on("connect", function () {
        console.info("[puser][io] connected to puser server:", spu.origin);
        this.emit("get nilai list", soyut.Session.id);
      });

      spu.socket.on(
        "nilai list updated",
        function (list) {
          for (var i = 0, y = list.length; i < y; i++) {
            soyut.penilaianUser.nilaiData.push(list[i]);
          }
          spu.checklistObj = spu.helper.buildCollection(spu.checklists, "id");
        }.bind(this)
      );

      spu.socket.on(
        "new nilai appeared",
        function (nilai) {
          console.log("new nilai appeared", nilai);
          this.handleNilaiUpdate(nilai, true);
        }.bind(this)
      );

      spu.socket.on(
        "nilai updated",
        function (nilai) {
          console.log("nilai updated", nilai);
          this.handleNilaiUpdate(nilai, false);
        }.bind(this)
      );

      spu.socket.on("error", function (err) {
        console.log("error", err);
      });
    },
    mounted: function () {
      console.log("[puser] app mounted");
      this.getLogo("Lambang_TNI_AU.png");
      this.initAlertSystem();
      this.initPanelControl();
      this.getScenarioId(
        this.sessionId,
        function (scenarioId) {
          this.getRoleGroups(
            scenarioId,
            function (roleGroups) {
              spu.roleGroups = roleGroups;
              spu.roleGroupsObj = spu.helper.buildCollection(roleGroups, "id");
              this.$nextTick(
                function () {
                  spu.poskoData.mappedGroup = this.initMappedGroup(
                    roleGroups,
                    this.nilaiData
                  );
                  this.mapKodeNilai(this.checklists);

                  // this.loading = false;
                  // this.showSessionList = true;
                }.bind(this)
              );
            }.bind(this)
          );
        }.bind(this)
      );
      setTimeout(
        function () {
          this.loading = false;
          this.showSessionList = true;
          spu.getNilaiNilaiAktivitas(
            soyut.Session.id,
            spu.aktivitasData.lembarNilai.penilaian,
            spu.distributeSavedNilaiIntoPelaku,
            spu.aktivitasData.paraPelaku
          );
        }.bind(this),
        3000
      ); //1618
    },
    methods: {
      handleNilaiUpdate: function (nilai, isNew) {
        if (isNew) {
          spu.poskoData.addNilai(nilai);
        } else {
          spu.poskoData.updateNilai(nilai);
        }
        this.mapSingleDataToListByKey(nilai, spu.nilaiData, "id", "id");
        spu.distributeSavedNilaiIntoPelaku(nilai, spu.aktivitasData.paraPelaku);

        // untuk posko data karena pakai array jadi yang update saja
        if (nilai.hasOwnProperty("day")) {
          this.updateMappedGroup(nilai, spu.poskoData.mappedGroup);
        }
        this.needRefreshData = true;
      },
      initMappedGroup: function (roleGroups, nilaiData) {
        return roleGroups.map(function (group) {
          group.nilaiData = [];
          nilaiData.reduce(function (_group, _nilai) {
            if (_nilai.subyek && _group.id === _nilai.subyek.refId) {
              _group.nilaiData.push(_nilai);
            }
            return _group;
          }, group);
          return group;
        });
      },
      updateMappedGroup: function (nilai, mappedGroup) {
        if (this.isNilaiKogas(nilai)) {
          mappedGroup.map(
            function (group) {
              if (group.id === nilai.subyek.refId) {
                this.mapSingleDataToListByKey(
                  nilai,
                  group.nilaiData,
                  "id",
                  "id"
                );
              }
              return group;
            }.bind(this)
          );
        } else {
          console.log(logName, "updateMappedGroup, nilai is not nilai Kogas");
        }
      },
      isNilaiKogas: function (nilai) {
        return nilai.hasOwnProperty("subyek") && !nilai.hasOwnProperty("day");
      },
      mapRoleGroup: function (roleGroups, nilaiData) {
        // /**
        //  * initial creation
        //  */
        // if (roleGroups.constructor === Array && nilaiData.constructor === Array) {
        // } else {
        //     // single nilai for socket update
        //     if (nilaiData.subyek && group.id === nilaiData.subyek.refId) {
        //     }
        // }
      },
      getLogo: function (file) {
        soyut.penilaianUser.getOrigin(
          null,
          function (err, origin) {
            if (!err) {
              this.origin = origin;
              this.logo = "https://" + origin + "/assets/" + file;
            } else {
              console.log(
                "failed to get logo on, " + origin + " assets:",
                file
              );
            }
          }.bind(this)
        );
      },
      initAlertSystem: function () {
        console.log(
          "[puser] alert system initiated",
          soyut.penilaianUser.alert
        );
        soyut.penilaianUser.alert.SetOption({
          container: $(".puser-container"),
        });
      },
      initPanelControl: function () {
        if ($.PanelCtrl) {
          soyut.penilaianUser.panel = new $.PanelCtrl(
            "#" + $(".puser-root").parent().parent().attr("id")
          );
        } else {
          console.log("PanelCtrl is not installed");
        }
      },
      getScenarioId: function (sessionId, callback) {
        soyut.penilaianUser.api.getScenarioId(
          sessionId,
          function (err, response) {
            if (!err) {
              this.scenarioId = response;
              callback(response);
            }
          }.bind(this)
        );
      },
      getRoleGroups: function (scenarioId, callback) {
        soyut.penilaianUser.api.getRoleGroups(
          scenarioId,
          function (err, roleGroups) {
            if (!err) {
              if (callback) {
                callback(roleGroups);
              }
            }
          }.bind(this)
        );
      },
      /**
       * mapKodeNilai
       * menambahkan data kode lembar nilai, dimasukkan kedalam checklists
       * @param checklists
       */
      mapKodeNilai: function (checklists) {
        api.getLembarNilai(
          spu.mainId,
          function (err, penilaians) {
            var arr = [];
            spu.penilaians = penilaians;
            checklists.map(function (checklist) {
              penilaians.reduce(function (_checklist, _penilaian) {
                if (_checklist.penilaian === _penilaian.id) {
                  _checklist.code = _penilaian.code;
                  arr.push(_checklist);
                }
                return _checklist;
              }, checklist);
              return checklist;
            });
            return arr;
          }.bind(this)
        );
      },
      // toObject: function (arr, obj, key) {
      //     arr.forEach(function (item) {
      //         obj[item[key]] = item;
      //     });
      //     return obj;
      // },
      mapSingleDataToListByKey: function (data, list, keyData, keyList) {
        var arr = [];
        arr.push(data);
        return this.mapDataToListByKey(arr, list, keyData, keyList);
      },
      mapDataToListByKey: function (data, list, keyData, keyList) {
        var found = false;
        data.reduce(function (a, b) {
          return a.map(function (item) {
            if (item[keyList] === b[keyData]) {
              item.aspeks = b.aspeks;
              found = true;
              return b;
            } else {
              return item;
            }
          });
        }, list);
        if (!found) {
          list.push(data[0]);
        }
        return list;
      },
      // createSingleMappedData: function (checklist) {
      //     // this.mappedData[checklist.id] = checklist;
      // },
      removesDuplicates: function (arr) {
        var arrObj = {};
        var arrRes = [];
        for (var i = 0; i < arr.length; i++) {
          if (!(arr[i] in arrObj)) {
            arrRes.push(arr[i]);
            arrObj[arr[i]] = true;
          } else {
            console.log(arr[i] + " has been registered");
          }
        }
        return arrRes;
      },
      resetData: function () {
        this.selectedRoleGroup = {};
        this.roles = [];
      },
      refreshDetail: function (roleGroup) {
        this.selectedRoleGroup = {};
        this.savedUserRole[roleGroup.id] = null;
        this.selectRoleGroup(roleGroup);
      },
      // todo: remove selectSession method
      // selectSession: function (session) {
      //     if (this.sessionId === session.id) {
      //         console.log('you were selecting the same session', session.name);
      //     } else {
      //         this.resetData();
      //         this.sessionId = session.id;
      //         this.activeSessionData = session;
      //         this.showSessionDetail = true;
      //         this.userRole = this.savedUserRole[session.id] || this.getUserRole(session.id);
      //     }
      // },
      getUserRole: function (roleGroupId) {
        console.log(
          "[puser] no userList saved for roleGroupId: ",
          roleGroupId,
          " download from server..."
        );
        var self = this,
          _sessionId = this.sessionId,
          _roleGroup = this.selectedRoleGroup,
          _roleGroupId = roleGroupId,
          _scenarioId = this.scenarioId,
          _roles = [],
          _filteredRoles = [], // filter to roleGroup
          _userIds = [],
          _users = [],
          _userData = [],
          _userRole = [];
        async.series(
          {
            roles: function (callback) {
              if (self.savedRoleList[_scenarioId]) {
                callback(null, self.savedRoleList[_scenarioId]);
              } else {
                soyut.penilaianUser.api.getRoleList(_scenarioId, function (
                  err,
                  roles
                ) {
                  _roles = roles;
                  self.savedRoleList[_roleGroupId] = roles;
                  callback(null, roles);
                });
              }
            },
            filteredRoles: function (callback) {
              var filtered = _roles.filter(function (role) {
                if (role.roleGroup === _roleGroup.id) {
                  return role;
                }
              });
              _filteredRoles = filtered;
              callback(null, filtered);
            },
            userIds: function (callback) {
              console.log("_filteredRoles", _filteredRoles);
              var userIds = [];
              for (var i = 0; i < _filteredRoles.length; i++) {
                soyut.penilaianUser.api.getUserId(
                  _sessionId,
                  _filteredRoles[i].id,
                  function (err, userId) {
                    if (userId !== null) {
                      userIds.push(userId);
                    }
                  }
                );
              }
              _userIds = userIds;
              callback(null, userIds);
            },
            users: function (callback) {
              console.log("_userIds", _userIds);
              setTimeout(function () {
                for (var i = 0; i < _userIds.length; i++) {
                  soyut.penilaianUser.api.getUserData(
                    _userIds[i].user,
                    function (err, userData) {
                      _users.push(userData);
                    }
                  );
                }
                callback(null, _users);
              }, 618);
            },
            userData: function (callback) {
              setTimeout(function () {
                console.log("_users", _users);
                var mapped = _userIds.map(function (userId) {
                  for (var i = 0; i < _users.length; i++) {
                    // todo: property _users[i].user tidak selalu ada
                    if (_users[i] && userId.user === _users[i].id) {
                      userId.data = _users[i];
                    }
                  }
                  return userId;
                });
                _userData = mapped;
                callback(null, mapped);
              }, 1000);
            },
            userRole: function (callback) {
              var mapped = _filteredRoles.map(function (role) {
                for (var i = 0; i < _userData.length; i++) {
                  if (role !== null && role.id === _userData[i].role) {
                    role.userData = _userData[i].data;
                  }
                }
                return role;
              });
              _userRole = mapped;
              callback(null, mapped);
            },
          },
          function (err, results) {
            console.log("[puser] done async with results: ", results);
            self.savedUserRole[_roleGroupId] = results.userRole;
            self.userRole = results.userRole;
          }
        );
      },
      selectUser: function (role) {
        if (!role.userData) {
          soyut.penilaianUser.alert.Alert(
            "Tidak ada user yang mengisi role ini"
          );
          return;
        } else {
          this.selectedUser = role;
          this.showSessionDetail = false;
          this.showSessionList = false;
          this.showNilaiList = true;
        }
      },
      closeLembarNilai: function () {
        this.selectedChecklist = {};
        this.showLembarNilai = false;
        // todo: reset alert penilaianapi dari sini ?
        if (this.checkListUserBreadCrumbs === "Posko") {
          this.closeNilaiList();
        } else {
          this.showNilaiList = true;
          this.showLembarNilai = false;
        }
      },
      closeNilaiList: function () {
        this.$nextTick(
          function () {
            this.selectedUser = {};
            this.showSessionDetail = true;
            this.showSessionList = true;
            this.showNilaiList = false;
          }.bind(this)
        );
      },
      closeSessionDetail: function () {
        this.resetData();
        this.showSessionDetail = false;
      },
      selectChecklist: function (checklist, subyek, category) {
        var self = this;
        soyut.penilaianUser
          .subyek_findAsync({
            filter: {
              sessionId: soyut.penilaianUser.session.id,
              refId: subyek.ref.id,
              type: subyek.type,
            },
          })
          .then(function (findResult) {
            if (findResult.length > 0) {
              self.subyek = findResult[0];
              return Promise.resolve();
            } else {
              return soyut.penilaianUser
                .subyek_createAsync({
                  params: {
                    sessionId: soyut.penilaianUser.session.id,
                    refId: subyek.ref.id,
                    type: subyek.type,
                  },
                })
                .then(function (subyek) {
                  self.subyek = subyek;
                  return Promise.resolve();
                });
            }
          })
          .then(function () {
            if (!checklist.penilaian) {
              soyut.penilaianUser.alert.Alert(
                "Tidak ada lembar nilai untuk aspek '" +
                  checklist.aspect +
                  "' di sesi " +
                  self.activeSessionData.name +
                  " mohon hubungi administrator"
              );
              return Promise.reject(
                "Tidak ada lembar nilai untuk aspek '" +
                  checklist.aspect +
                  "' di sesi " +
                  self.activeSessionData.name +
                  " mohon hubungi administrator"
              );
            }
            self.selectedChecklist = checklist;
            self.category = category;

            self.showSessionList = false;
            self.showSessionDetail = false;
            self.showNilaiList = false;
            self.showLembarNilai = true;

            self.$nextTick(function () {
              soyut.penilaianUser.api.loadViewSheet(
                ".puser-lembar-nilai",
                checklist.penilaian,
                {
                  penilai: self.penilai,
                  subyek: self.subyek,
                  session: self.session,
                }
              );
            });
            return Promise.resolve();
          })
          .catch(function (err) {
            console.error("Caught error while selecting checklist: ", err);
          });
      },
      selectRoleGroup: function (roleGroup) {
        if (this.selectedRoleGroup.id === roleGroup.id) {
          console.log("you were selecting the same roleGroup", roleGroup.name);
        } else {
          this.resetData();
          this.selectedRoleGroup = roleGroup;
          this.showSessionDetail = true;
          this.userRole =
            this.savedUserRole[roleGroup.id] || this.getUserRole(roleGroup.id);
          // this.userRole = this.savedUserRole[session.id] || this.getUserRole(session.id);
        }
      },
      selectTab: function (category) {
        console.log(logName, "selecting tab", category);
        if (this.activeTab !== category) {
          this.activeTab = category;
        } else {
          console.log(logName, "the tab already selected", category);
        }
      },
      refresh: function () {
        var refreshCat = "Memperbaharui Data";
        var tempCat = "";
        this.refreshing = true;
        if (this.activeTab !== refreshCat) {
          tempCat = this.activeTab;
        }
        this.selectTab(refreshCat);
        setTimeout(
          function () {
            this.selectTab("Aktivitas Pelaku");
            setTimeout(
              function () {
                this.selectTab(tempCat);
                this.needRefreshData = false;
                this.refreshing = false;
              }.bind(this),
              618
            );
          }.bind(this),
          1
        );
      },
      handleOpenBook: function () {
        var app = getAppInstance();

        if (!this.openBook) {
          var activitylistener = getActivityInstanceAsync();
          activitylistener.then(
            function (activity) {
              app.launchExternalActivity(
                "soyut.module.penilaianUser.kunci",
                {},
                app,
                function (instance) {
                  this.openBook = true;
                  this.openBookInstance = instance;
                  this.openBookInstance.on("onClose", this.handleBookClosed);
                }.bind(this)
              );
            }.bind(this)
          );
        }
      },
      ExportToCsv: function () {
        //nilaian perorangan
        var np_paraPelaku = spu.aktivitasData.paraPelaku;
        var np_excludedGroupId = "58dc6d156f000f6e20923fd0"; // todo: remove from penilaian manager, 'DEV' rolegroup
        var np_nilaiNilaiKogas = spu.poskoData.nilaiNilaiKogas; // already calculated by halaman nilaiPosko
        var np_nilaiNilaiAkhir = [];

        //semua posko
        var sp_produk = spu.komponen.produk;
        var sp_checklists = spu.checklists;
        var sp_roleGroupsName = spu.roleGroups;
        var sp_nilaiData = spu.nilaiData;

        //aktivitas pelaku
        var ap_paraPelaku = spu.aktivitasData.paraPelaku; // todo: kalau dirubah ke Object ga ke render
        var ap_groupedPelaku = spu.aktivitasData.groupedPelaku;
        var ap_dayInfo = "";
        var ap_hoveredDay = "";
        var ap_trainingDays = spu.aktivitasData.trainingDays;
        var ap_roleGroups = spu.aktivitasData.roleGroups;

        var sp_roleGrouped = JSON.parse(
          document.getElementById("sp_role_groups").value
        );
        var sp_poskoChecklisted = JSON.parse(
          document.getElementById("sp_posko_check_lists").value
        );
        var sp_mapGrouped = JSON.parse(
          document.getElementById("sp_mapped_group").value
        );
        var sp_nilaiDatas = JSON.parse(
          document.getElementById("sp_nilai_data").value
        );

        var result = Object.keys(np_paraPelaku).map(function (key) {
          return [key, np_paraPelaku[key]];
        });

        var result_parsNilaiKogas = Object.keys(np_nilaiNilaiKogas).map(
          function (key) {
            return [key, np_nilaiNilaiKogas[key]];
          }
        );

        var result_parsNilai = Object.keys(result_parsNilaiKogas[1]).map(
          function (key) {
            return [key, result_parsNilaiKogas[1][key]];
          }
        );

        var result_parsJumlah = Object.keys(result_parsNilai[1][1].nilai).map(
          function (key) {
            return [key, result_parsNilai[1][1].nilai[key]];
          }
        );

        // ===NILAI PERORANGAN===
        
        try {
          var htmlTable = "<table><thead>";
          htmlTable +=
            "<tr>" +
            "<th>NO</th>" +
            "<th>NAMA</th>" +
            "<th>PANGKAT/KORP</th>" +
            "<th>PANGKAT/NRP</th>" +
            "<th>NILAI AKTIVITAS</th>" +
            "<th>PRODUK</th>" +
            "<th>NILAI AKHIR</th>" +
            "</tr>";

          htmlTable += "<tr>";
          for (var i = 1; i < 8; i++) {
            htmlTable += "<th>" + i + "</th>";
          }
          htmlTable += "</tr>";
          htmlTable += "</thead>";
          htmlTable += "<tbody>";
          for (var x = 0; x < result.length; x++) {
            var pelaku = result[x][1];
            if (
              pelaku.role.roleGroup !== "58dc6d156f000f6e20923fd0" &&
              pelaku.user.name &&
              pelaku.user.name !== "ReqlNonExistenceError"
            ) {
              htmlTable += "<tr>";
              htmlTable += "<td></td>";
              htmlTable += "<td>" + pelaku.user.name + "</td>";
              htmlTable += "<td>" + pelaku.user.rank + "</td>";
              htmlTable +=
                "<td>" + pelaku.user.rank + " / " + pelaku.user.nrp + "</td>";
              htmlTable += "<td>" + pelaku.nilaiAktivitas.average + "</td>"; // nilai aktivitas

              //produk
              var prod = np_nilaiNilaiKogas[pelaku.role.roleGroup].getResult();
              htmlTable += "<td>" + prod + "</td>";

              var tambah = (pelaku.nilaiAktivitas.average + prod) / 2;
              htmlTable += "<td>" + tambah + "</td>";
              htmlTable += "</tr>";
            }
          }
          htmlTable += "</tbody>";
          htmlTable += "</table>";

          console.log(htmlTable);
          
        } catch (exception) {
          console.error(exception);
          console.error("Nilai perorangan fail");
        }
        // ===AKTIVITAS PELAKU===

        var htmlTableAp = "<div>";
        var result = Object.keys(ap_groupedPelaku).map(function (key) {
          return [key, ap_groupedPelaku[key]];
        });
        for (var x = 0; x < result.length; x++) {
          var result_pars = Object.keys(result[x][1].paraPelaku).map(function (
            key
          ) {
            return [key, result[x][1].paraPelaku[key]];
          });

          if (result_pars.length > 0) {
            htmlTableAp += "<h3>" + result[x][1].name + "</h3>";
            htmlTableAp += "<table><thead>";
            htmlTableAp +=
              "<tr>" +
              "<th rowspan='2'>NO</th>" +
              "<th rowspan='2'>NAMA</th>" +
              "<th rowspan='2'>PANGKAT/KORP</th>" +
              "<th rowspan='2'>JABATAN DALAM LATIHAN</th>" +
              "<th colspan="+ap_trainingDays+">NILAI AKTIVITAS</th>" +
              "<th rowspan='2'>RATA-RATA</th>";
            ("</tr>");

            var trainingDays = ap_trainingDays + 1;
            htmlTableAp += "<tr>";
            for (var n = 1; n < trainingDays; n++) {
              htmlTableAp += "<th>" + "H" + n + "</th>";
            }
            htmlTableAp += "</tr>";

            var trainingIndex = ap_trainingDays + 6;
            htmlTableAp += "<tr>";
            for (var i = 1; i < trainingIndex; i++) {
              htmlTableAp += "<th>" + i + "</th>";
            }
            htmlTableAp += "</tr>";
            htmlTableAp += "</thead>";
            htmlTableAp += "<tbody>";

            for (var a = 0; a < result_pars.length; a++) {
              var pelaku = result_pars[a][1];
              htmlTableAp += "<tr>";
              htmlTableAp += "<td></td>";
              htmlTableAp += "<td>" + pelaku.user.name + "</td>";
              htmlTableAp += "<td>" + pelaku.user.rank + "</td>";
              htmlTableAp +=
                "<td>" +
                pelaku.role.position +
                " / " +
                pelaku.role.positionCode +
                "</td>";
            for (var i = 1; i < trainingDays; i++){
              var nilAktivitas = pelaku.nilaiAktivitas.day[i].average;
              htmlTableAp += "<td>" + nilAktivitas + "</td>";
            }
              htmlTableAp += "<td>" + pelaku.nilaiAktivitas.average + "</td>";
              htmlTableAp += "</tr>";
            }
            htmlTableAp += "</tbody>";
            htmlTableAp += "</table>";
          }
        }
        htmlTableAp += "</div>";
        console.log(htmlTableAp);

        // ===SEMUA POSKO===
        
        var htmlTableOp = "<table><thead>";
        htmlTableOp += "<tr>";
        htmlTableOp += "<th>NO</th>";
        htmlTableOp += "<th>ASPEK PENILAIAN</th>";
        for (var x = 0; x < sp_roleGrouped.length; x++) {
          htmlTableOp += "<th>" + sp_roleGrouped[x].name + "</th>";
        }
        ("</tr>");

        var nilaiUserAkhir = document.getElementsByClassName("hasil-nilai");
        var number = 1;
        var counter = 1;
        for (var a = 0; a < sp_poskoChecklisted.length; a++) {
          if (!sp_poskoChecklisted[a].parent) {
            htmlTableOp +=
              "<tr>" +
              "<td>" +
              number++ +
              "</td>" +
              "<td>" +
              sp_poskoChecklisted[a].aspect +
              " " +
              sp_poskoChecklisted[a].code +
              "</td>";
            for (var x = 0; x < sp_roleGrouped.length; x++) {
              var totalNilaiUser = +nilaiUserAkhir[
                x + sp_roleGrouped.length * a
              ].innerText;
              totalNilaiUser = isNaN(totalNilaiUser) ? "" : totalNilaiUser;
              htmlTableOp += "<td>" + totalNilaiUser + "</td>";
            }
            htmlTableOp += "</tr>";
          }
        }

        var nilaiKogasAkhir = document.getElementsByClassName(
          "hasil-akhir-kogas"
        );

        htmlTableOp += "<tr>";
        htmlTableOp += "<td></td>";
        htmlTableOp += "<td>REKAPITULASI NILAI AKHIR</td>";
        for (var x = 0; x < sp_roleGrouped.length; x++) {
          var totalNilaiKogas = +nilaiKogasAkhir[x].innerText;
          totalNilaiKogas = isNaN(totalNilaiKogas) ? "" : totalNilaiKogas;
          htmlTableOp += "<td>" + totalNilaiKogas + "</td>";
        }
        htmlTableOp += "</tr>";

        htmlTableOp += "<tr>";
        htmlTableOp += "<td></td>";
        htmlTableOp += "<td></td>";
        for (var x = 0; x < sp_roleGrouped.length; x++) {
          htmlTableOp += "<th>" + sp_roleGrouped[x].name + "</th>";
        }
        htmlTableOp += "</tr>";
        htmlTableOp += "</thead>";
        htmlTableOp += "</tbody>";
        htmlTableOp += "</table>";

        console.log(htmlTableOp);
        
        // Export to CSV
        
        var csv_data = [];
 
        // Get each row data
        var rows = document.getElementsByTagName('tr');
        for (var i = 0; i < rows.length; i++) {
 
        // Get each column data
        var cols = rows[i].querySelectorAll('td,th');
 
        // Stores each csv row data
        var csvrow = [];
          for (var j = 0; j < cols.length; j++) {
 
          // Get the text data of each cell
          // of a row and push it to csvrow
            csvrow.push(cols[j].innerHTML);
          }
 
          // Combine each column value with comma
          csv_data.push(csvrow.join(","));
          }
 
          // Combine each row data with new line character
          csv_data = csv_data.join('\n');
 
          // Call this function to download csv file 
          downloadCSVFile(csv_data);
            
          function downloadCSVFile(csv_data) {
 
          // Create CSV file object and feed
          // our csv_data into it
          var CSVFile = new Blob([csv_data], {
              type: "text/csv"
          });
 
          // Create to temporary link to initiate
          // download process
          var temp_link = document.createElement('a');
 
          // Download csv file
          temp_link.download = "Penilaian.csv";
          var url = window.URL.createObjectURL(CSVFile);
          temp_link.href = url;
 
          // This link should not be displayed
          temp_link.style.display = "none";
          document.body.appendChild(temp_link);
 
          // Automatically click the link to
          // trigger download
          temp_link.click();
          document.body.removeChild(temp_link);
        }
      },
      handleBookClosed: function () {
        this.openBook = false;
        this.openBookInstance.unbind("onClose", this.handleBookClosed);
      },
    },
    destroyed: function () {
      console.log(logName, "app closed");
    },
  });
};

/**
 * Prepare and Init App
 */
soyut.penilaianUser.resetGlobal();
soyut.penilaianUser.helper.initSmoothState();
soyut.penilaianUser.helper.mergeSoyutService("penilaianUser", "penilaian_user");
soyut.penilaianUser.helper.modifyCssParent(".puser-root");

soyut.penilaianUser
  .init()
  .then(function () {
    soyut.penilaianUser.instantiate(
      soyut,
      soyut.penilaianUser,
      soyut.penilaianUser.api,
      jQuery,
      Vue
    );
    soyut.penilaianUser.initPenilaianAktivitas(function (err, results) {
      console.log("[puser][aktivitasPelaku]", "done async:", err, results);
    });
  })
  .catch(function (err) {
    console.log("Caught error when initialize penilaian: ", err);
  });