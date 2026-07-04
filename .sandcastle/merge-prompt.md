# TASK

Merge the following branches into the current branch:

{{BRANCHES}}

For each branch:

1. Run `git merge <branch> --no-edit`
2. If there are merge conflicts, resolve them intelligently by reading both sides and choosing the correct resolution
3. After resolving conflicts, run `pnpm build` and `pnpm check` to verify everything works
4. If tests fail, fix the issues before proceeding to the next branch

After all branches are merged, make a single commit summarizing the merge.

If the merges already produced a merge commit, do not force an extra empty commit.
If every merge was a fast-forward and there is nothing to commit, create a single empty summary commit with `git commit --allow-empty -m "Merge sandcastle issue <ID>"` for one issue, or `git commit --allow-empty -m "Merge sandcastle issues <ID1> and <ID2>"` for multiple issues.

# CLOSE ISSUES

For each branch that was merged, close its issue using the following command:

`gh issue close <ID> --comment "Completed by Sandcastle"`

Here are all the issues:

{{ISSUES}}

Once you've merged everything you can, output <promise>COMPLETE</promise>.
