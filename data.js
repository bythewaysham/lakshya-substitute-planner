/* Seed data: [name, subject, group, timetable]
   timetable = 6 days (Mon..Sat) joined by "/", each day = 7 periods joined by "|", cell = class like VIIIA.
   Photos se padha gaya hai, kuch handwritten cells approx hain -> Teachers tab mein edit karo.
   Empty timetable wale teachers free-list mein tab tak nahi aate jab tak unka timetable na bhar do. */
const SEED=[
["Gulshan Kumar","History / Polity","SST","|XA|IXB|VIIIB|VIIIA||IXA/|XA|IXB|VIIIB|VIIIA||IXA/|XA|IXB|VIIIB|||IXA/XB|XA||VIIA||IXB|VIA/XB|XA||VIIA||IXB|VIA/XB|XA||||IXB|"],
["Sachin Rajak","SST (VI–VIII)","SST","||VIIB|VIB|VIA|VIA|/||VIIB|VIB|VIA|VIA|/||VIIB||VIA||/||VIIIB||VIA|VIB|/||VIIIB||VIA|VIB|/||VIIIB|VIIIB|VIA|VIB|"],
["Ramashankar Sharma","Geography","SST","IXB|IXA|VIIIB|VIIIA||VIIB|VIIA/IXB|IXA|VIIIB|VIIIA||VIIB|VIIA/IXB|IXA|VIIB|VIIIA|VIB|VIIIB|IXA/IXB|IXA|VIIIB|VIIIA||VIIB|IXA/IXB||VIIIB|VIIIA||VIIB|XA/IXB|IXA|||VIB|VIIIB|XA"],
["Sanjay Kumar","Economics / Pol. Science","SST","|VIB||XB|VIIA|IXB|XA/|VIB||XB|VIIA|IXB|XA/|VIIIA||XB|VIIA|IXB|XA/|IXA||XB|VIIIA||IXA/|IXA||XB|VIIIA||IXA/|IXA||XB|VIIIA|VIB|IXA"],
["Yasir Arafat","Physics","Sci","||XA|IXB||XB|IXB/IXA||XA|IXB||XB|/IXA||XA|IXB||XB|/IXA|VIIIB|VIIIA|IXB|XA|XB|/IXA|VIIIB|VIIIA|||XB|/IXA|VIIIB|VIIIA||||"],
["Mukesh Rai","Chemistry","Sci","IXA|VIIIB||IXA|XA||XB/IXA|VIIIB||IXA|XA||XB/||VIIIB|||XA|XB/IXB||VIIB||XA|XB|VIIIA/IXB||VIIB|IXB|XA|XB|VIIIA/IXB||VIIB|IXB|XA||VIIIA"],
["Alok Kumar Singh","Biology","Sci","IXB||VIIB|IXA|XA|VIIIB|VIIIB/IXB||VIIB|IXA|XA|VIIIB|VIIA/IXB||VIIB|IXA|VIIA|VIIIB|VIIIA/IXB||XA|IXA|VIIA||XB/IXB||XA|IXA|VIIA||XB/IXB||XA|IXA|VIIA|XB|XB"],
["Shailesh Kumar","Maths","Math","XA||IXA|||VIIIA|/XA|VIIB|IXA|||VIIIA|/XA|VIIB|IXA|||VIIIA|/XA|VIIB|IXA|||VIIIA|/XA|VIIB|IXA|||VIIIA|/XA|VIIB|IXA|||VIIIA|"],
["Rishi Kumar","Maths / English Grammar","Math","VIIIA|XB|VIA||IXB||VIIIB/VIIIA|XB|VIA||IXB||VIIIB/VIIIA|XB|VIA||IXB||VIIIB/VIIIB|XB|VIA||IXB||VIIIB/VIIIB|XB|VIA||IXB||VIIIB/VIIIB|XB|VIA||IXB||VIIIB"],
["Prakash Jha","Maths","Math","VIIA|||VA|VIB||VIB/VIIA|||VA|VIB||VIB/VIIA|||VA|VIB||/VIIA|||VA|VIB||/VIIA|||VA|VIB||/VIIA|||VA|VIB||VIB"],
["Jai Prakash Raushan","Hindi","Lang","||XA|XB||IXA|IXB/||XA|XB||IXA|IXB/||XA|XB||IXA|/||XA|XB||IXA|IXB/||XA|XB|||IXB/||XA|XB||IXA|IXB"],
["Neyaz Alam","Sanskrit / Urdu","Lang","||VIIIB|VIA|||/||VIIIB|VIA|||/||VIIIB|VIA|||/||VIB|VIIIA|VIIB|VIIA|/||VIB|VIIIA|VIIB|VIIA|/||VIB|VIIIA|VIIB|VIIA|"],
["Mahesh Kr. Singh","Computer","IT",""],
["Vishal Sir","Maths","Math",""],
["Umesh Sir","English","Lang",""],
["Saumya Sir","English Lit.","Lang",""],
["Karunesh Kumar","English","Lang",""],
["Sanjeev Jha","Hindi / Sanskrit","Lang",""],
["Mr. Rajnish","Hindi","Lang",""],
["Suraj Kumar Sharma","Physical Education","PE",""],
["Vibhuti","Physical Education","PE",""],
["Ajeet","Library","Lib",""]
];
