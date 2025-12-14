SELECT "role", COUNT(*) 
FROM "User"
GROUP BY "role"
ORDER BY "role";