git log --oneline main | wc -l  # < 20 = perfect
git log --oneline develop | wc -l  # 50-500 = healthy active dev

# Delete all local branches except main/develop
git branch | grep "feature/" | xargs git branch -D

# Delete matching remote branches
git branch -r | grep "feature/" | sed 's/origin\///' | xargs -I {} git push origin --delete {}