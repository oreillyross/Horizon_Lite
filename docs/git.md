git log --oneline main | wc -l  # < 20 = perfect
git log --oneline develop | wc -l  # 50-500 = healthy active dev

# Delete all local branches except main/develop
git branch | grep "feature/" | xargs git branch -D

# Delete matching remote branches
git branch -r | grep "feature/" | sed 's/origin\///' | xargs -I {} git push origin --delete {}

# How to Make History Searchable

This is the real “scan history” trick: **conventional commits + good PR titles.**

## Use a Small Set

- **feat:** new user-facing capability  
- **fix:** bug fix  
- **test:** tests only  
- **refactor:** refactor (no behavior change)  
- **chore:** tooling/config  
- **docs:** docs/specs  

## Example

```bash
feat(home): add home screen scaffold  
fix(snippets): ensure tags parse correctly  
test(edit): wait for RHF submit before asserting mutate
